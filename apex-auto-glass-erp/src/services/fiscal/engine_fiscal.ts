/**
 * MOTOR FISCAL COMPLETO
 * Responsável por todas as regras fiscais, cálculos e validações
 */

import {
    ItemNotaFiscal,
    NotaFiscal,
    TotaisNotaFiscal,
    ResultadoRecalculo,
    ResultadoValidacao,
    TipoItem,
    TipoOperacao,
    RegimeTributario,
    ImpostosItemNFe,
    ImpostosItemNFSe,
} from '@/types/fiscal';

import {
    definirRegraPorItem,
    definirRegraPorOperacao,
    validarCFOP,
    validarNCM,
    validarCST,
    obterAliquotaICMS,
    validarCPFCNPJ,
    validarIE,
    ALIQUOTA_PIS,
    ALIQUOTA_COFINS,
    ALIQUOTA_ISS_PADRAO,
} from './fiscal_rules';

/**
 * RECALCULAR ITEM
 * Recalcula todos os impostos e valores de um item
 */
export function recalcularItem(
    item: ItemNotaFiscal,
    nota: NotaFiscal,
    regimeTributario: RegimeTributario = 'simples_nacional'
): ResultadoRecalculo {
    const alteracoes: ResultadoRecalculo['alteracoes'] = [];
    const itemAtualizado = { ...item };

    // 1. Recalcular valor total do item
    const valorAnterior = itemAtualizado.valor_total;
    itemAtualizado.valor_total = (itemAtualizado.quantidade * itemAtualizado.valor_unitario) - itemAtualizado.desconto;
    
    if (Math.abs(valorAnterior - itemAtualizado.valor_total) > 0.01) {
        alteracoes.push({
            campo: 'valor_total',
            valor_anterior: valorAnterior,
            valor_novo: itemAtualizado.valor_total,
        });
    }

    // 2. Obter regra fiscal
    const regra = definirRegraPorItem(itemAtualizado, nota.tipo_operacao, regimeTributario);

    // 3. Recalcular impostos baseado no tipo
    if (itemAtualizado.tipo === 'produto') {
        itemAtualizado.impostos = recalcularImpostosNFe(
            itemAtualizado,
            nota,
            regimeTributario,
            regra
        ) as ImpostosItemNFe;
    } else {
        itemAtualizado.impostos = recalcularImpostosNFSe(
            itemAtualizado,
            nota,
            regra
        ) as ImpostosItemNFSe;
    }

    // 4. Recalcular totais da nota
    const totaisAtualizados = recalcularTotais(nota);

    return {
        item_atualizado: itemAtualizado,
        totais_atualizados: totaisAtualizados,
        alteracoes,
    };
}

/**
 * RECALCULAR IMPOSTOS NFe (Produto)
 */
function recalcularImpostosNFe(
    item: ItemNotaFiscal,
    nota: NotaFiscal,
    regime: RegimeTributario,
    regra: any
): ImpostosItemNFe {
    const impostos: ImpostosItemNFe = {
        icms: {
            origem: '0', // Nacional
            base_calculo: 0,
            aliquota: 0,
            valor: 0,
        },
        ipi: {
            cst: '99',
            base_calculo: 0,
            aliquota: 0,
            valor: 0,
        },
        pis: {
            cst: '01',
            base_calculo: 0,
            aliquota: ALIQUOTA_PIS,
            valor: 0,
        },
        cofins: {
            cst: '01',
            base_calculo: 0,
            aliquota: ALIQUOTA_COFINS,
            valor: 0,
        },
    };

    // Se já tem impostos, preservar CST/CSOSN
    if (item.impostos && 'icms' in item.impostos) {
        const impAntigo = item.impostos as ImpostosItemNFe;
        impostos.icms.cst = impAntigo.icms.cst;
        impostos.icms.csosn = impAntigo.icms.csosn;
        impostos.icms.origem = impAntigo.icms.origem || '0';
        impostos.ipi.cst = impAntigo.ipi.cst;
        impostos.pis.cst = impAntigo.pis.cst;
        impostos.cofins.cst = impAntigo.cofins.cst;
    }

    // Base de cálculo (valor do produto)
    const baseCalculo = item.valor_total;

    // ICMS
    if (regime === 'simples_nacional') {
        // Simples Nacional - usar CSOSN
        const csosn = impostos.icms.csosn || '102';
        impostos.icms.csosn = csosn;
        
        // CSOSN 102, 103, 300, 400, 500 = isento
        if (['102', '103', '300', '400', '500'].includes(csosn)) {
            impostos.icms.base_calculo = 0;
            impostos.icms.aliquota = 0;
            impostos.icms.valor = 0;
        } else {
            // Outros CSOSN - calcular normalmente
            const aliquota = regra?.calculo_icms?.aliquota_padrao || 
                           obterAliquotaICMS(nota.destinatario.endereco.uf) || 18;
            impostos.icms.base_calculo = baseCalculo;
            impostos.icms.aliquota = aliquota;
            impostos.icms.valor = (baseCalculo * aliquota) / 100;
        }
    } else {
        // Regime Normal - usar CST
        const cst = impostos.icms.cst || '00';
        impostos.icms.cst = cst;
        
        // CST 40, 41, 50, 60 = isento ou não tributado
        if (['40', '41', '50', '60'].includes(cst)) {
            impostos.icms.base_calculo = 0;
            impostos.icms.aliquota = 0;
            impostos.icms.valor = 0;
        } else {
            const aliquota = regra?.calculo_icms?.aliquota_padrao || 
                           obterAliquotaICMS(nota.destinatario.endereco.uf) || 18;
            impostos.icms.base_calculo = baseCalculo;
            impostos.icms.aliquota = aliquota;
            impostos.icms.valor = (baseCalculo * aliquota) / 100;
        }
    }

    // IPI (se aplicável)
    if (item.ncm && item.ncm.startsWith('22')) {
        // Bebidas - exemplo de cálculo de IPI
        const aliquotaIPI = regra?.calculo_ipi?.aliquota_padrao || 10;
        impostos.ipi.base_calculo = baseCalculo;
        impostos.ipi.aliquota = aliquotaIPI;
        impostos.ipi.valor = (baseCalculo * aliquotaIPI) / 100;
    }

    // PIS
    impostos.pis.base_calculo = baseCalculo;
    impostos.pis.valor = (baseCalculo * impostos.pis.aliquota) / 100;

    // COFINS
    impostos.cofins.base_calculo = baseCalculo;
    impostos.cofins.valor = (baseCalculo * impostos.cofins.aliquota) / 100;

    return impostos;
}

/**
 * RECALCULAR IMPOSTOS NFSe (Serviço)
 */
function recalcularImpostosNFSe(
    item: ItemNotaFiscal,
    nota: NotaFiscal,
    regra: any
): ImpostosItemNFSe {
    const impostos: ImpostosItemNFSe = {
        iss: {
            base_calculo: 0,
            aliquota: 0,
            valor: 0,
            retido: false,
            codigo_servico: '',
            codigo_municipio: '',
        },
        pis: {
            base_calculo: 0,
            aliquota: ALIQUOTA_PIS,
            valor: 0,
        },
        cofins: {
            base_calculo: 0,
            aliquota: ALIQUOTA_COFINS,
            valor: 0,
        },
    };

    // Se já tem impostos, preservar dados
    if (item.impostos && 'iss' in item.impostos) {
        const impAntigo = item.impostos as ImpostosItemNFSe;
        impostos.iss.codigo_servico = impAntigo.iss.codigo_servico || item.codigo_servico || '1401';
        impostos.iss.codigo_municipio = impAntigo.iss.codigo_municipio || nota.emitente.endereco.codigo_municipio;
        impostos.iss.retido = impAntigo.iss.retido || false;
    } else {
        impostos.iss.codigo_servico = item.codigo_servico || '1401';
        impostos.iss.codigo_municipio = nota.emitente.endereco.codigo_municipio;
    }

    // Base de cálculo
    const baseCalculo = item.valor_total;

    // ISS
    const aliquotaISS = regra?.calculo_iss?.aliquota_padrao || ALIQUOTA_ISS_PADRAO;
    impostos.iss.base_calculo = baseCalculo;
    impostos.iss.aliquota = aliquotaISS;
    impostos.iss.valor = (baseCalculo * aliquotaISS) / 100;

    // PIS
    impostos.pis.base_calculo = baseCalculo;
    impostos.pis.valor = (baseCalculo * impostos.pis.aliquota) / 100;

    // COFINS
    impostos.cofins.base_calculo = baseCalculo;
    impostos.cofins.valor = (baseCalculo * impostos.cofins.aliquota) / 100;

    return impostos;
}

/**
 * RECALCULAR TOTAIS
 * Recalcula todos os totais da nota fiscal
 */
export function recalcularTotais(nota: NotaFiscal): TotaisNotaFiscal {
    const totais: TotaisNotaFiscal = {
        valor_produtos: 0,
        valor_servicos: 0,
        valor_descontos: 0,
        valor_frete: nota.totais?.valor_frete || 0,
        valor_seguro: nota.totais?.valor_seguro || 0,
        valor_outras_despesas: nota.totais?.valor_outras_despesas || 0,
        valor_icms: 0,
        valor_icms_st: 0,
        valor_ipi: 0,
        valor_pis: 0,
        valor_cofins: 0,
        valor_iss: 0,
        valor_iss_retido: 0,
        valor_total: 0,
        valor_total_tributos: 0,
    };

    // Percorrer itens e somar
    nota.itens.forEach(item => {
        if (item.tipo === 'produto') {
            totais.valor_produtos += item.valor_total;
            
            if (item.impostos && 'icms' in item.impostos) {
                const imp = item.impostos as ImpostosItemNFe;
                totais.valor_icms += imp.icms.valor;
                totais.valor_icms_st += imp.icms.valor_st || 0;
                totais.valor_ipi += imp.ipi.valor;
                totais.valor_pis += imp.pis.valor;
                totais.valor_cofins += imp.cofins.valor;
            }
        } else {
            totais.valor_servicos += item.valor_total;
            
            if (item.impostos && 'iss' in item.impostos) {
                const imp = item.impostos as ImpostosItemNFSe;
                totais.valor_iss += imp.iss.valor;
                if (imp.iss.retido) {
                    totais.valor_iss_retido += imp.iss.valor;
                }
                totais.valor_pis += imp.pis.valor;
                totais.valor_cofins += imp.cofins.valor;
            }
        }
        
        totais.valor_descontos += item.desconto;
    });

    // Calcular total
    totais.valor_total = 
        totais.valor_produtos + 
        totais.valor_servicos + 
        totais.valor_frete + 
        totais.valor_seguro + 
        totais.valor_outras_despesas - 
        totais.valor_descontos;

    // Total de tributos
    totais.valor_total_tributos = 
        totais.valor_icms + 
        totais.valor_icms_st + 
        totais.valor_ipi + 
        totais.valor_pis + 
        totais.valor_cofins + 
        totais.valor_iss;

    return totais;
}

/**
 * VALIDAR NOTA
 * Valida todos os campos obrigatórios e regras fiscais
 */
export function validarNota(nota: NotaFiscal): ResultadoValidacao {
    const erros: ResultadoValidacao['erros'] = [];
    const avisos: ResultadoValidacao['avisos'] = [];

    // 1. Validações básicas
    if (!nota.numero) {
        erros.push({ campo: 'numero', mensagem: 'Número da nota é obrigatório' });
    }
    if (!nota.serie) {
        erros.push({ campo: 'serie', mensagem: 'Série da nota é obrigatória' });
    }
    if (!nota.data_emissao) {
        erros.push({ campo: 'data_emissao', mensagem: 'Data de emissão é obrigatória' });
    }

    // 2. Validar emitente
    if (!validarCPFCNPJ(nota.emitente.cpf_cnpj)) {
        erros.push({ campo: 'emitente.cpf_cnpj', mensagem: 'CPF/CNPJ do emitente inválido' });
    }
    if (!nota.emitente.razao_social) {
        erros.push({ campo: 'emitente.razao_social', mensagem: 'Razão social do emitente é obrigatória' });
    }
    if (nota.tipo_operacao === 'saida' && nota.emitente.inscricao_estadual) {
        if (!validarIE(nota.emitente.inscricao_estadual, nota.emitente.endereco.uf)) {
            avisos.push({ campo: 'emitente.inscricao_estadual', mensagem: 'Inscrição estadual do emitente pode estar inválida' });
        }
    }

    // 3. Validar destinatário
    if (!validarCPFCNPJ(nota.destinatario.cpf_cnpj)) {
        erros.push({ campo: 'destinatario.cpf_cnpj', mensagem: 'CPF/CNPJ do destinatário inválido' });
    }
    if (!nota.destinatario.razao_social) {
        erros.push({ campo: 'destinatario.razao_social', mensagem: 'Razão social do destinatário é obrigatória' });
    }

    // 4. Validar itens
    if (!nota.itens || nota.itens.length === 0) {
        erros.push({ campo: 'itens', mensagem: 'A nota deve ter pelo menos um item' });
    } else {
        nota.itens.forEach((item, index) => {
            // Validar produto
            if (item.tipo === 'produto') {
                if (!item.ncm) {
                    erros.push({ campo: `itens[${index}].ncm`, mensagem: 'NCM é obrigatório para produtos' });
                } else if (!validarNCM(item.ncm)) {
                    erros.push({ campo: `itens[${index}].ncm`, mensagem: 'NCM inválido (deve ter 8 dígitos)' });
                }
                
                if (!item.cfop) {
                    erros.push({ campo: `itens[${index}].cfop`, mensagem: 'CFOP é obrigatório para produtos' });
                } else if (!validarCFOP(item.cfop, nota.tipo_operacao)) {
                    erros.push({ campo: `itens[${index}].cfop`, mensagem: `CFOP ${item.cfop} inválido para ${nota.tipo_operacao}` });
                }

                if (item.impostos && 'icms' in item.impostos) {
                    const imp = item.impostos as ImpostosItemNFe;
                    if (!imp.icms.cst && !imp.icms.csosn) {
                        erros.push({ campo: `itens[${index}].impostos.icms`, mensagem: 'CST ou CSOSN é obrigatório' });
                    }
                }
            } else {
                // Validar serviço
                if (!item.codigo_servico) {
                    erros.push({ campo: `itens[${index}].codigo_servico`, mensagem: 'Código de serviço é obrigatório' });
                }
                
                if (item.impostos && 'iss' in item.impostos) {
                    const imp = item.impostos as ImpostosItemNFSe;
                    if (!imp.iss.aliquota || imp.iss.aliquota === 0) {
                        erros.push({ campo: `itens[${index}].impostos.iss.aliquota`, mensagem: 'Alíquota de ISS é obrigatória' });
                    }
                }
            }

            // Validar valores
            if (item.quantidade <= 0) {
                erros.push({ campo: `itens[${index}].quantidade`, mensagem: 'Quantidade deve ser maior que zero' });
            }
            if (item.valor_unitario <= 0) {
                erros.push({ campo: `itens[${index}].valor_unitario`, mensagem: 'Valor unitário deve ser maior que zero' });
            }
        });
    }

    // 5. Validar totais
    const totaisCalculados = recalcularTotais(nota);
    if (Math.abs(totaisCalculados.valor_total - (nota.totais?.valor_total || 0)) > 0.01) {
        avisos.push({ 
            campo: 'totais.valor_total', 
            mensagem: `Total calculado (${totaisCalculados.valor_total.toFixed(2)}) diverge do total informado (${(nota.totais?.valor_total || 0).toFixed(2)})` 
        });
    }

    return {
        valida: erros.length === 0,
        erros,
        avisos,
    };
}

/**
 * DEFINIR REGRA POR OPERAÇÃO
 */
export function definirRegraPorOperacaoFiscal(
    tipo: TipoItem,
    operacao: TipoOperacao
) {
    return definirRegraPorOperacao(tipo, operacao);
}

/**
 * DEFINIR REGRA POR PRODUTO
 */
export function definirRegraPorProduto(
    item: ItemNotaFiscal,
    operacao: TipoOperacao,
    regime: RegimeTributario
) {
    if (item.tipo !== 'produto') return null;
    return definirRegraPorItem(item, operacao, regime);
}

/**
 * DEFINIR REGRA POR SERVIÇO
 */
export function definirRegraPorServico(
    item: ItemNotaFiscal,
    operacao: TipoOperacao
) {
    if (item.tipo !== 'servico') return null;
    return definirRegraPorItem(item, operacao, 'simples_nacional');
}

/**
 * DETECTAR TIPO DE NOTA
 * Identifica se é NFe, NFSe ou mista
 */
export function detectarTipoNota(nota: NotaFiscal): 'nfe' | 'nfse' | 'mista' {
    const temProduto = nota.itens.some(i => i.tipo === 'produto');
    const temServico = nota.itens.some(i => i.tipo === 'servico');

    if (temProduto && temServico) return 'mista';
    if (temProduto) return 'nfe';
    if (temServico) return 'nfse';
    
    // Default: assumir produto se não tiver itens ainda
    return 'nfe';
}

