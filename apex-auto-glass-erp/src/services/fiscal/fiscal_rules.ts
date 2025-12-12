/**
 * REGRAS FISCAIS
 * Define todas as regras de cálculo e validação fiscal
 */

import { 
    TipoItem, 
    TipoOperacao, 
    RegimeTributario, 
    CSTICMS, 
    CSTPISCOFINS,
    RegraFiscal,
    ItemNotaFiscal,
    NotaFiscal
} from '@/types/fiscal';

/**
 * CFOPs válidos por operação
 */
export const CFOP_ENTRADA = [
    '1101', '1102', '1201', '1202', '1301', '1302', '1401', '1402', '1403', '1404',
    '1405', '1406', '1407', '1408', '1409', '1410', '1411', '1414', '1415', '1501',
    '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509', '1510', '1511',
    '1512', '1513', '1514', '1515', '1516', '1517', '1518', '1519', '1520', '1521',
    '1522', '1523', '1551', '1552', '1553', '1554', '1555', '1556', '1557', '1558',
    '1559', '1560', '1601', '1602', '1603', '1604', '1605', '1606', '1607', '1608',
    '1651', '1652', '1653', '1654', '1655', '1656', '1657', '1658', '1901', '1902',
    '1903', '1904', '1905', '1906', '1907', '1908', '1909', '1910', '1911', '1912',
    '1913', '1914', '1915', '1916', '1917', '1918', '1919', '1920', '1921', '1922',
    '1923', '1924', '1925', '1949', '2101', '2102', '2201', '2202', '2551', '2552',
    '2553', '2554', '2555', '2556', '2901', '2902', '2903', '2904', '2905', '2906',
    '2907', '2908', '2909', '2910', '2911', '2912', '2913', '2914', '2915', '2916',
    '2917', '2918', '2919', '2920', '2921', '2922', '2923', '2924', '2925', '2949',
];

export const CFOP_SAIDA = [
    '5101', '5102', '5103', '5104', '5105', '5106', '5107', '5108', '5109', '5110',
    '5111', '5112', '5113', '5114', '5115', '5116', '5117', '5118', '5119', '5120',
    '5121', '5122', '5123', '5124', '5125', '5301', '5302', '5303', '5304', '5305',
    '5306', '5307', '5308', '5309', '5310', '5311', '5312', '5313', '5314', '5315',
    '5316', '5317', '5318', '5319', '5320', '5321', '5322', '5323', '5324', '5325',
    '5401', '5402', '5403', '5404', '5405', '5406', '5407', '5408', '5409', '5410',
    '5411', '5412', '5413', '5414', '5415', '5416', '5417', '5418', '5419', '5420',
    '5501', '5502', '5503', '5504', '5505', '5506', '5507', '5508', '5509', '5510',
    '5511', '5512', '5513', '5514', '5515', '5516', '5517', '5518', '5519', '5520',
    '5551', '5552', '5553', '5554', '5555', '5556', '5557', '5558', '5559', '5560',
    '5601', '5602', '5603', '5604', '5605', '5606', '5607', '5608', '5609', '5610',
    '5611', '5612', '5613', '5614', '5615', '5616', '5617', '5618', '5619', '5620',
    '5901', '5902', '5903', '5904', '5905', '5906', '5907', '5908', '5909', '5910',
    '5911', '5912', '5913', '5914', '5915', '5916', '5917', '5918', '5919', '5920',
    '5921', '5922', '5923', '5924', '5925', '5949', '6101', '6102', '6103', '6104',
    '6105', '6106', '6107', '6108', '6109', '6110', '6111', '6112', '6113', '6114',
    '6115', '6116', '6117', '6118', '6119', '6120', '6121', '6122', '6123', '6124',
    '6125', '6901', '6902', '6903', '6904', '6905', '6906', '6907', '6908', '6909',
    '6910', '6911', '6912', '6913', '6914', '6915', '6916', '6917', '6918', '6919',
    '6920', '6921', '6922', '6923', '6924', '6925', '6949',
];

/**
 * CST/CSOSN permitidos por regime tributário
 */
export const CST_SIMPLES_NACIONAL: CSTICMS[] = ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'];
export const CST_REGIME_NORMAL: CSTICMS[] = ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'];

/**
 * Alíquotas padrão por estado (ICMS)
 */
export const ALIQUOTAS_ICMS: Record<string, number> = {
    'AC': 17, 'AL': 18, 'AP': 18, 'AM': 18, 'BA': 18, 'CE': 18,
    'DF': 18, 'ES': 17, 'GO': 17, 'MA': 18, 'MT': 17, 'MS': 17,
    'MG': 18, 'PA': 17, 'PB': 18, 'PR': 18, 'PE': 18, 'PI': 18,
    'RJ': 20, 'RN': 18, 'RS': 18, 'RO': 17.5, 'RR': 17, 'SC': 17,
    'SP': 18, 'SE': 18, 'TO': 18,
};

/**
 * Alíquotas padrão PIS/COFINS
 */
export const ALIQUOTA_PIS = 1.65; // %
export const ALIQUOTA_COFINS = 7.6; // %

/**
 * Alíquotas padrão ISS (varia por município)
 */
export const ALIQUOTA_ISS_PADRAO = 5; // %

/**
 * Regras fiscais pré-definidas
 */
export const REGRAS_FISCAIS: RegraFiscal[] = [
    {
        id: 'compra_estado',
        nome: 'Compra dentro do estado',
        tipo: 'produto',
        operacao: 'entrada',
        cfop: ['1101', '1102', '1201', '1202'],
        cst_permitidos: ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'],
        calculo_icms: {
            base: 'valor_produto',
            aliquota_padrao: 18,
        },
        calculo_pis_cofins: {
            base: 'valor_produto',
            aliquota_pis: 1.65,
            aliquota_cofins: 7.6,
        },
        validacoes: [
            { campo: 'cfop', obrigatorio: true },
            { campo: 'ncm', obrigatorio: true },
            { campo: 'cst', obrigatorio: true },
        ],
    },
    {
        id: 'venda_estado',
        nome: 'Venda dentro do estado',
        tipo: 'produto',
        operacao: 'saida',
        cfop: ['5101', '5102', '5103', '5104'],
        cst_permitidos: ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'],
        calculo_icms: {
            base: 'valor_produto',
            aliquota_padrao: 18,
        },
        calculo_pis_cofins: {
            base: 'valor_produto',
            aliquota_pis: 1.65,
            aliquota_cofins: 7.6,
        },
        validacoes: [
            { campo: 'cfop', obrigatorio: true },
            { campo: 'ncm', obrigatorio: true },
            { campo: 'cst', obrigatorio: true },
        ],
    },
    {
        id: 'servico_tomado',
        nome: 'Serviço tomado',
        tipo: 'servico',
        operacao: 'entrada',
        calculo_iss: {
            aliquota_padrao: 5,
            codigo_servico: '1401',
        },
        calculo_pis_cofins: {
            base: 'valor_produto',
            aliquota_pis: 1.65,
            aliquota_cofins: 7.6,
        },
        validacoes: [
            { campo: 'codigo_servico', obrigatorio: true },
            { campo: 'iss.aliquota', obrigatorio: true },
        ],
    },
    {
        id: 'servico_prestado',
        nome: 'Serviço prestado',
        tipo: 'servico',
        operacao: 'saida',
        calculo_iss: {
            aliquota_padrao: 5,
            codigo_servico: '1401',
        },
        calculo_pis_cofins: {
            base: 'valor_produto',
            aliquota_pis: 1.65,
            aliquota_cofins: 7.6,
        },
        validacoes: [
            { campo: 'codigo_servico', obrigatorio: true },
            { campo: 'iss.aliquota', obrigatorio: true },
        ],
    },
];

/**
 * Função para obter regra fiscal baseada no item e operação
 */
export function definirRegraPorItem(
    item: ItemNotaFiscal,
    operacao: TipoOperacao,
    regime: RegimeTributario
): RegraFiscal | null {
    const regras = REGRAS_FISCAIS.filter(r => 
        r.tipo === item.tipo && 
        r.operacao === operacao
    );

    // Se há CFOP, filtrar por CFOP
    if (item.cfop) {
        const regraCFOP = regras.find(r => r.cfop?.includes(item.cfop!));
        if (regraCFOP) return regraCFOP;
    }

    // Retornar primeira regra encontrada
    return regras[0] || null;
}

/**
 * Função para obter regra fiscal baseada na operação
 */
export function definirRegraPorOperacao(
    tipo: TipoItem,
    operacao: TipoOperacao
): RegraFiscal | null {
    return REGRAS_FISCAIS.find(r => 
        r.tipo === tipo && 
        r.operacao === operacao
    ) || null;
}

/**
 * Função para validar CFOP
 */
export function validarCFOP(cfop: string, operacao: TipoOperacao): boolean {
    const cfopsValidos = operacao === 'entrada' ? CFOP_ENTRADA : CFOP_SAIDA;
    return cfopsValidos.includes(cfop);
}

/**
 * Função para validar NCM
 */
export function validarNCM(ncm: string): boolean {
    const ncmClean = ncm.replace(/\D/g, '');
    return ncmClean.length === 8;
}

/**
 * Função para validar CST/CSOSN
 */
export function validarCST(
    cst: string,
    regime: RegimeTributario
): boolean {
    if (regime === 'simples_nacional') {
        return CST_SIMPLES_NACIONAL.includes(cst as CSTICMS);
    }
    return CST_REGIME_NORMAL.includes(cst as CSTICMS);
}

/**
 * Função para obter alíquota ICMS padrão por UF
 */
export function obterAliquotaICMS(uf: string): number {
    return ALIQUOTAS_ICMS[uf.toUpperCase()] || 18;
}

/**
 * Função para validar CNPJ/CPF
 */
export function validarCPFCNPJ(doc: string): boolean {
    const clean = doc.replace(/\D/g, '');
    return clean.length === 11 || clean.length === 14;
}

/**
 * Função para validar Inscrição Estadual
 */
export function validarIE(ie: string, uf: string): boolean {
    // Validação básica - em produção, usar biblioteca específica
    const clean = ie.replace(/\D/g, '');
    return clean.length >= 8 && clean.length <= 14;
}

