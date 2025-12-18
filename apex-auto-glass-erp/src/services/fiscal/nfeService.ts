/**
 * SERVIÇO COMPLETO DE NF-e (MODELO 55)
 * Nota Fiscal Eletrônica - Emissão, Envio, Eventos
 */

import { supabase } from '@/integrations/supabase/client';
import { gerarXMLNFe } from './xml_generator';
import { xmlSignatureService } from './xmlSignatureService';
import { certificateService } from './certificateService';
import { getSefazEndpoints, UF } from './sefazEndpoints';
import { NotaFiscal } from '@/types/fiscal';
import { fiscalAuditor } from './fiscalAuditor';

export interface NFeEmitida {
    id?: string;
    company_id: string;
    chave_acesso: string;
    numero: string;
    serie: string;
    modelo: string;
    data_emissao: string;
    data_autorizacao?: string;
    emitente_cnpj: string;
    emitente_razao_social: string;
    destinatario_cpf_cnpj: string;
    destinatario_razao_social: string;
    valor_produtos: number;
    valor_servicos: number;
    valor_total: number;
    status: 'rascunho' | 'assinada' | 'enviada' | 'autorizada' | 'cancelada' | 'denegada' | 'rejeitada';
    protocolo_autorizacao?: string;
    xml_assinado?: string;
    xml_autorizado?: string;
    ambiente: 'homologacao' | 'producao';
}

export interface NFeItem {
    id?: string;
    nfe_id: string;
    company_id: string;
    produto_id?: string;
    sequencia: number;
    codigo?: string;
    descricao: string;
    ncm?: string;
    cfop?: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    desconto?: number;
    icms_cst?: string;
    icms_csosn?: string;
    icms_base_calculo?: number;
    icms_aliquota?: number;
    icms_valor?: number;
}

export interface NFeEvento {
    id?: string;
    nfe_id: string;
    company_id: string;
    tipo_evento: '110111' | '110110' | '110102' | '210100' | '210200' | '210240' | '210250';
    descricao_evento: string;
    sequencia: number;
    protocolo?: string;
    justificativa?: string;
    xml_evento: string;
    xml_retorno?: string;
    status: 'pendente' | 'processado' | 'rejeitado' | 'erro';
}

/**
 * Serviço completo de NF-e
 */
export const nfeService = {
    /**
     * Criar nova NF-e (rascunho)
     */
    async criarNFe(nota: NotaFiscal, companyId: string, userId?: string): Promise<string> {
        try {
            // AUDITORIA FISCAL: Validar antes de emitir
            const emitenteCNPJ = nota.emitente.cpf_cnpj.replace(/\D/g, '');
            const canEmit = await fiscalAuditor.canEmitNFe(companyId, emitenteCNPJ);
            
            if (!canEmit.canEmit) {
                throw new Error(`❌ EMISSÃO BLOQUEADA: ${canEmit.reason}`);
            }

            // Validar CNPJ do emitente
            const cnpjValidation = fiscalAuditor.validateCNPJ(emitenteCNPJ);
            if (!cnpjValidation.isValid) {
                throw new Error(`❌ CNPJ INVÁLIDO: ${cnpjValidation.message}`);
            }

            // Gerar chave de acesso
            const chaveAcesso = this.gerarChaveAcesso(nota);

            // Criar registro no banco
            const { data: nfe, error } = await supabase
                .from('nfe_emitidas')
                .insert([{
                    company_id: companyId,
                    chave_acesso: chaveAcesso,
                    numero: nota.numero,
                    serie: nota.serie,
                    modelo: '55',
                    data_emissao: nota.data_emissao,
                    emitente_cnpj: nota.emitente.cpf_cnpj.replace(/\D/g, ''),
                    emitente_razao_social: nota.emitente.razao_social,
                    destinatario_cpf_cnpj: nota.destinatario.cpf_cnpj.replace(/\D/g, ''),
                    destinatario_razao_social: nota.destinatario.razao_social,
                    valor_produtos: nota.totais.valor_produtos,
                    valor_servicos: nota.totais.valor_servicos,
                    valor_total: nota.totais.valor_total,
                    valor_icms: nota.totais.valor_icms,
                    valor_ipi: nota.totais.valor_ipi,
                    valor_pis: nota.totais.valor_pis,
                    valor_cofins: nota.totais.valor_cofins,
                    status: 'rascunho',
                    ambiente: 'homologacao', // TODO: Buscar da configuração
                    created_by: userId,
                }])
                .select('id')
                .single();

            if (error) throw error;

            // Salvar itens
            await this.salvarItensNFe(nfe.id, nota.itens, companyId);

            return nfe.id;
        } catch (error: any) {
            console.error('Erro ao criar NF-e:', error);
            throw error;
        }
    },

    /**
     * Salvar itens da NF-e
     */
    async salvarItensNFe(nfeId: string, itens: any[], companyId: string): Promise<void> {
        const itensToInsert = itens.map((item, index) => {
            const impostos = item.impostos || {};
            const icms = impostos.icms || {};
            const ipi = impostos.ipi || {};
            const pis = impostos.pis || {};
            const cofins = impostos.cofins || {};

            return {
                nfe_id: nfeId,
                company_id: companyId,
                produto_id: item.produto_id,
                sequencia: index + 1,
                codigo: item.codigo,
                descricao: item.descricao,
                ncm: item.ncm,
                cfop: item.cfop,
                unidade: item.unidade,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
                desconto: item.desconto || 0,
                icms_cst: icms.cst,
                icms_csosn: icms.csosn,
                icms_base_calculo: icms.base_calculo || 0,
                icms_aliquota: icms.aliquota || 0,
                icms_valor: icms.valor || 0,
                ipi_cst: ipi.cst,
                ipi_base_calculo: ipi.base_calculo || 0,
                ipi_aliquota: ipi.aliquota || 0,
                ipi_valor: ipi.valor || 0,
                pis_cst: pis.cst,
                pis_base_calculo: pis.base_calculo || 0,
                pis_aliquota: pis.aliquota || 0,
                pis_valor: pis.valor || 0,
                cofins_cst: cofins.cst,
                cofins_base_calculo: cofins.base_calculo || 0,
                cofins_aliquota: cofins.aliquota || 0,
                cofins_valor: cofins.valor || 0,
            };
        });

        const { error } = await supabase
            .from('nfe_itens')
            .insert(itensToInsert);

        if (error) throw error;
    },

    /**
     * Gerar chave de acesso da NF-e
     */
    gerarChaveAcesso(nota: NotaFiscal): string {
        // Código da UF
        const cUF = this.getCodigoUF(nota.emitente.endereco.uf);
        
        // Ano e mês (AAMM)
        const data = new Date(nota.data_emissao);
        const aamm = `${data.getFullYear().toString().substring(2)}${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        // CNPJ do emitente (14 dígitos)
        const cnpj = nota.emitente.cpf_cnpj.replace(/\D/g, '').padStart(14, '0');
        
        // Modelo (55 para NF-e)
        const mod = '55';
        
        // Série (3 dígitos)
        const serie = nota.serie.padStart(3, '0');
        
        // Número da NF (9 dígitos)
        const nNF = nota.numero.padStart(9, '0');
        
        // Tipo de emissão (1=Normal)
        const tpEmis = '1';
        
        // Código numérico aleatório (8 dígitos)
        const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
        
        // Montar chave (sem dígito verificador)
        const chave = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
        
        // Calcular dígito verificador
        const dv = this.calcularDigitoVerificador(chave);
        
        return `${chave}${dv}`;
    },

    /**
     * Calcular dígito verificador da chave de acesso
     */
    calcularDigitoVerificador(chave: string): string {
        const pesos = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        
        let soma = 0;
        for (let i = 0; i < chave.length; i++) {
            soma += parseInt(chave[i]) * pesos[i];
        }
        
        const resto = soma % 11;
        return resto < 2 ? '0' : String(11 - resto);
    },

    /**
     * Obter código da UF
     */
    getCodigoUF(uf: string): string {
        const codigos: Record<string, string> = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
            'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
            'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
            'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
            'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
            'SE': '28', 'TO': '17',
        };
        return codigos[uf.toUpperCase()] || '35';
    },

    /**
     * Assinar NF-e
     * NOTA: Em produção, isso deve ser feito no backend
     */
    async assinarNFe(nfeId: string, companyId: string): Promise<string> {
        try {
            // Buscar NF-e
            const { data: nfe, error: nfeError } = await supabase
                .from('nfe_emitidas')
                .select('*')
                .eq('id', nfeId)
                .eq('company_id', companyId)
                .single();

            if (nfeError || !nfe) throw new Error('NF-e não encontrada');

            // Buscar itens
            const { data: itens } = await supabase
                .from('nfe_itens')
                .select('*')
                .eq('nfe_id', nfeId)
                .order('sequencia');

            // Reconstruir objeto NotaFiscal (simplificado)
            // TODO: Implementar reconstrução completa

            // Gerar XML
            // TODO: Reconstruir NotaFiscal completa e gerar XML
            // const xml = gerarXMLNFe(nota);

            // Assinar XML (deve ser feito no backend)
            // TODO: Chamar API backend para assinar

            // Por enquanto, retorna erro informativo
            throw new Error('Assinatura de NF-e deve ser feita no backend. Implementar API de assinatura.');

        } catch (error: any) {
            console.error('Erro ao assinar NF-e:', error);
            throw error;
        }
    },

    /**
     * Enviar NF-e para SEFAZ
     * NOTA: Em produção, isso deve ser feito no backend via SOAP
     */
    async enviarNFe(nfeId: string, companyId: string): Promise<{
        success: boolean;
        protocolo?: string;
        xml_autorizado?: string;
        erro?: string;
    }> {
        try {
            // Buscar NF-e
            const { data: nfe } = await supabase
                .from('nfe_emitidas')
                .select('*')
                .eq('id', nfeId)
                .eq('company_id', companyId)
                .single();

            if (!nfe || !nfe.xml_assinado) {
                throw new Error('NF-e não encontrada ou não assinada');
            }

            // Buscar configuração fiscal
            const { data: config } = await supabase
                .from('fiscal_config')
                .select('uf, ambiente')
                .eq('company_id', companyId)
                .single();

            if (!config || !config.uf) {
                throw new Error('Configuração fiscal incompleta');
            }

            // Obter endpoint SEFAZ
            const endpoints = getSefazEndpoints(
                config.uf as UF,
                config.ambiente || 'homologacao'
            );

            // TODO: Implementar envio real via SOAP
            // Por enquanto, retorna estrutura preparada
            return {
                success: false,
                erro: 'Envio de NF-e deve ser feito no backend via SOAP. Implementar comunicação real com SEFAZ.',
            };

        } catch (error: any) {
            console.error('Erro ao enviar NF-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Cancelar NF-e
     */
    async cancelarNFe(
        nfeId: string,
        justificativa: string,
        companyId: string,
        userId?: string
    ): Promise<{
        success: boolean;
        protocolo?: string;
        erro?: string;
    }> {
        try {
            // Buscar NF-e
            const { data: nfe } = await supabase
                .from('nfe_emitidas')
                .select('*')
                .eq('id', nfeId)
                .eq('company_id', companyId)
                .single();

            if (!nfe) throw new Error('NF-e não encontrada');

            if (nfe.status !== 'autorizada') {
                throw new Error('Apenas NF-e autorizadas podem ser canceladas');
            }

            // Validar justificativa (mínimo 15 caracteres)
            if (!justificativa || justificativa.trim().length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }

            // Gerar XML de cancelamento
            // TODO: Implementar geração de XML de cancelamento

            // Salvar evento de cancelamento
            const { data: evento, error: eventoError } = await supabase
                .from('nfe_eventos')
                .insert([{
                    nfe_id: nfeId,
                    company_id: companyId,
                    tipo_evento: '110111',
                    descricao_evento: 'Cancelamento',
                    sequencia: 1,
                    justificativa: justificativa,
                    xml_evento: '', // TODO: Gerar XML
                    status: 'pendente',
                    created_by: userId,
                }])
                .select()
                .single();

            if (eventoError) throw eventoError;

            // TODO: Enviar para SEFAZ (backend)

            return {
                success: true,
            };

        } catch (error: any) {
            console.error('Erro ao cancelar NF-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Emitir Carta de Correção
     */
    async emitirCCe(
        nfeId: string,
        correcao: string,
        companyId: string,
        userId?: string
    ): Promise<{
        success: boolean;
        sequencia?: number;
        protocolo?: string;
        erro?: string;
    }> {
        try {
            // Buscar NF-e
            const { data: nfe } = await supabase
                .from('nfe_emitidas')
                .select('*')
                .eq('id', nfeId)
                .eq('company_id', companyId)
                .single();

            if (!nfe) throw new Error('NF-e não encontrada');

            if (nfe.status !== 'autorizada') {
                throw new Error('Apenas NF-e autorizadas podem ter Carta de Correção');
            }

            // Validar correção (mínimo 15 caracteres)
            if (!correcao || correcao.trim().length < 15) {
                throw new Error('Correção deve ter no mínimo 15 caracteres');
            }

            // Buscar última CC-e para obter sequência
            const { data: ultimaCCe } = await supabase
                .from('nfe_cces')
                .select('sequencia')
                .eq('nfe_id', nfeId)
                .order('sequencia', { ascending: false })
                .limit(1)
                .single();

            const sequencia = (ultimaCCe?.sequencia || 0) + 1;

            // Validar limite de CC-e (máximo 20)
            if (sequencia > 20) {
                throw new Error('Limite máximo de 20 Cartas de Correção por NF-e');
            }

            // Salvar CC-e
            const { data: cce, error: cceError } = await supabase
                .from('nfe_cces')
                .insert([{
                    nfe_id: nfeId,
                    company_id: companyId,
                    sequencia: sequencia,
                    correcao: correcao,
                    status: 'pendente',
                    created_by: userId,
                }])
                .select()
                .single();

            if (cceError) throw cceError;

            // TODO: Gerar XML e enviar para SEFAZ (backend)

            return {
                success: true,
                sequencia: sequencia,
            };

        } catch (error: any) {
            console.error('Erro ao emitir CC-e:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Inutilizar numeração
     */
    async inutilizarNumeracao(
        serie: string,
        numeroInicial: string,
        numeroFinal: string,
        justificativa: string,
        companyId: string,
        userId?: string
    ): Promise<{
        success: boolean;
        protocolo?: string;
        erro?: string;
    }> {
        try {
            // Validar justificativa (mínimo 15 caracteres)
            if (!justificativa || justificativa.trim().length < 15) {
                throw new Error('Justificativa deve ter no mínimo 15 caracteres');
            }

            // Validar range
            const numIni = parseInt(numeroInicial);
            const numFim = parseInt(numeroFinal);

            if (numIni > numFim) {
                throw new Error('Número inicial deve ser menor ou igual ao número final');
            }

            if (numFim - numIni > 10000) {
                throw new Error('Range máximo de 10.000 números por inutilização');
            }

            // Salvar inutilização
            const { data: inutilizacao, error: inutilError } = await supabase
                .from('nfe_inutilizacoes')
                .insert([{
                    company_id: companyId,
                    serie: serie,
                    numero_inicial: numeroInicial,
                    numero_final: numeroFinal,
                    justificativa: justificativa,
                    status: 'pendente',
                    created_by: userId,
                }])
                .select()
                .single();

            if (inutilError) throw inutilError;

            // TODO: Gerar XML e enviar para SEFAZ (backend)

            return {
                success: true,
            };

        } catch (error: any) {
            console.error('Erro ao inutilizar numeração:', error);
            return {
                success: false,
                erro: error.message,
            };
        }
    },

    /**
     * Buscar NF-e por ID
     */
    async buscarNFe(nfeId: string, companyId: string): Promise<NFeEmitida | null> {
        const { data, error } = await supabase
            .from('nfe_emitidas')
            .select('*')
            .eq('id', nfeId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) return null;
        return data as any;
    },

    /**
     * Listar NF-e
     */
    async listarNFe(
        companyId: string,
        filters?: {
            status?: string;
            dataInicio?: string;
            dataFim?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ data: NFeEmitida[]; count: number }> {
        let query = supabase
            .from('nfe_emitidas')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .order('data_emissao', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.dataInicio) {
            query = query.gte('data_emissao', filters.dataInicio);
        }

        if (filters?.dataFim) {
            query = query.lte('data_emissao', filters.dataFim);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        if (filters?.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: (data || []) as any[],
            count: count || 0,
        };
    },
};

