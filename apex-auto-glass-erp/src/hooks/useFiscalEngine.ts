/**
 * HOOK REACT PARA MOTOR FISCAL
 * Integra o motor fiscal com componentes React
 */

import { useState, useCallback, useMemo } from 'react';
import { 
    NotaFiscal, 
    ItemNotaFiscal, 
    ResultadoRecalculo, 
    ResultadoValidacao,
    RegimeTributario 
} from '@/types/fiscal';
import {
    recalcularItem,
    recalcularTotais,
    validarNota,
    detectarTipoNota,
} from '@/services/fiscal/engine_fiscal';
import { gerarXMLNFe, gerarXMLNFSe } from '@/services/fiscal/xml_generator';
import { supabase } from '@/integrations/supabase/client';
import { FiscalLog } from '@/types/fiscal';

export function useFiscalEngine(nota: NotaFiscal, regimeTributario: RegimeTributario = 'simples_nacional') {
    const [isRecalculando, setIsRecalculando] = useState(false);
    const [isValidando, setIsValidando] = useState(false);
    const [isGerandoXML, setIsGerandoXML] = useState(false);
    const [ultimaValidacao, setUltimaValidacao] = useState<ResultadoValidacao | null>(null);

    /**
     * Recalcular um item específico
     */
    const recalcularItemNota = useCallback(async (
        item: ItemNotaFiscal,
        index: number,
        notaAtualizada: NotaFiscal
    ): Promise<ResultadoRecalculo> => {
        setIsRecalculando(true);
        try {
            const resultado = recalcularItem(item, notaAtualizada, regimeTributario);
            
            // Criar log de recálculo
            await criarLogFiscal(notaAtualizada.id || '', {
                tipo_alteracao: 'recalculo',
                campo_alterado: `itens[${index}]`,
                valor_anterior: item,
                valor_novo: resultado.item_atualizado,
                dados_completos: resultado,
            });

            return resultado;
        } finally {
            setIsRecalculando(false);
        }
    }, [regimeTributario]);

    /**
     * Recalcular todos os itens e totais
     */
    const recalcularTudo = useCallback(async (notaAtualizada: NotaFiscal): Promise<NotaFiscal> => {
        setIsRecalculando(true);
        try {
            // Recalcular cada item
            const itensRecalculados: ItemNotaFiscal[] = [];
            for (let i = 0; i < notaAtualizada.itens.length; i++) {
                const item = notaAtualizada.itens[i];
                const resultado = recalcularItem(item, notaAtualizada, regimeTributario);
                itensRecalculados.push(resultado.item_atualizado);
            }

            // Recalcular totais
            const notaComItensAtualizados = {
                ...notaAtualizada,
                itens: itensRecalculados,
            };
            const totaisAtualizados = recalcularTotais(notaComItensAtualizados);

            const notaFinal = {
                ...notaComItensAtualizados,
                totais: totaisAtualizados,
                precisa_validacao_fiscal: true,
            };

            // Criar log
            await criarLogFiscal(notaFinal.id || '', {
                tipo_alteracao: 'recalculo',
                campo_alterado: 'todos_itens',
                dados_completos: {
                    itens_anteriores: notaAtualizada.itens,
                    itens_novos: itensRecalculados,
                    totais_anteriores: notaAtualizada.totais,
                    totais_novos: totaisAtualizados,
                },
            });

            return notaFinal;
        } finally {
            setIsRecalculando(false);
        }
    }, [regimeTributario]);

    /**
     * Validar nota fiscal
     */
    const validarNotaFiscal = useCallback(async (notaValidar: NotaFiscal): Promise<ResultadoValidacao> => {
        setIsValidando(true);
        try {
            const resultado = validarNota(notaValidar);
            setUltimaValidacao(resultado);

            // Criar log de validação
            await criarLogFiscal(notaValidar.id || '', {
                tipo_alteracao: 'validacao',
                dados_completos: resultado,
            });

            return resultado;
        } finally {
            setIsValidando(false);
        }
    }, []);

    /**
     * Gerar XML da nota
     */
    const gerarXML = useCallback(async (notaGerar: NotaFiscal): Promise<string> => {
        setIsGerandoXML(true);
        try {
            const tipo = detectarTipoNota(notaGerar);
            let xml = '';

            if (tipo === 'nfe') {
                xml = gerarXMLNFe(notaGerar);
            } else if (tipo === 'nfse') {
                xml = gerarXMLNFSe(notaGerar);
            } else {
                // Nota mista - gerar duas notas separadas
                const notaProdutos: NotaFiscal = {
                    ...notaGerar,
                    itens: notaGerar.itens.filter(i => i.tipo === 'produto'),
                    tipo: 'nfe',
                };
                const notaServicos: NotaFiscal = {
                    ...notaGerar,
                    itens: notaGerar.itens.filter(i => i.tipo === 'servico'),
                    tipo: 'nfse',
                };
                
                const xmlNFe = gerarXMLNFe(notaProdutos);
                const xmlNFSe = gerarXMLNFSe(notaServicos);
                
                xml = `<!-- NFe -->\n${xmlNFe}\n\n<!-- NFSe -->\n${xmlNFSe}`;
            }

            // Criar log de geração de XML
            await criarLogFiscal(notaGerar.id || '', {
                tipo_alteracao: 'geracao_xml',
                dados_completos: { xml, tipo },
            });

            return xml;
        } finally {
            setIsGerandoXML(false);
        }
    }, []);

    /**
     * Tipo de nota detectado
     */
    const tipoNota = useMemo(() => detectarTipoNota(nota), [nota]);

    return {
        recalcularItem: recalcularItemNota,
        recalcularTudo,
        validarNota: validarNotaFiscal,
        gerarXML,
        tipoNota,
        isRecalculando,
        isValidando,
        isGerandoXML,
        ultimaValidacao,
    };
}

/**
 * Criar log fiscal no banco
 */
async function criarLogFiscal(
    notaId: string,
    log: Partial<FiscalLog>
): Promise<void> {
    if (!notaId) return;

    try {
        const { error } = await supabase
            .from('fiscal_logs')
            .insert([{
                nota_id: notaId,
                tipo_alteracao: log.tipo_alteracao,
                campo_alterado: log.campo_alterado,
                valor_anterior: log.valor_anterior,
                valor_novo: log.valor_novo,
                dados_completos: log.dados_completos,
                observacao: log.observacao,
            }]);

        if (error) {
            console.error('Erro ao criar log fiscal:', error);
        }
    } catch (error) {
        console.error('Erro ao criar log fiscal:', error);
    }
}

