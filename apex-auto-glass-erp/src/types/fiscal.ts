/**
 * TIPOS DO MOTOR FISCAL
 * Definições completas para NFe e NFSe
 */

export type TipoNota = 'nfe' | 'nfse' | 'mista';
export type TipoItem = 'produto' | 'servico';
export type TipoOperacao = 'entrada' | 'saida';
export type RegimeTributario = 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
export type StatusNota = 'rascunho' | 'validada' | 'assinada' | 'enviada' | 'autorizada' | 'cancelada' | 'denegada';

// CST/CSOSN para ICMS
export type CSTICMS = 
    | '00' | '10' | '20' | '30' | '40' | '41' | '50' | '51' | '60' | '70' | '90'
    | '101' | '102' | '103' | '201' | '202' | '203' | '300' | '400' | '500' | '900';

// CST para PIS/COFINS
export type CSTPISCOFINS = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '49' | '50' | '51' | '52' | '53' | '54' | '55' | '56' | '60' | '61' | '62' | '63' | '64' | '65' | '66' | '67' | '70' | '71' | '72' | '73' | '74' | '75' | '98' | '99';

// Impostos do Item (Produto - NFe)
export interface ImpostosItemNFe {
    icms: {
        origem: string; // 0=Nacional, 1=Estrangeira, etc
        cst?: CSTICMS;
        csosn?: CSTICMS;
        base_calculo: number;
        aliquota: number;
        valor: number;
        base_st?: number;
        aliquota_st?: number;
        valor_st?: number;
        mva?: number;
        reducao_base?: number;
    };
    ipi: {
        cst: string;
        base_calculo: number;
        aliquota: number;
        valor: number;
        enquadramento?: string;
    };
    pis: {
        cst: CSTPISCOFINS;
        base_calculo: number;
        aliquota: number;
        valor: number;
    };
    cofins: {
        cst: CSTPISCOFINS;
        base_calculo: number;
        aliquota: number;
        valor: number;
    };
}

// Impostos do Item (Serviço - NFSe)
export interface ImpostosItemNFSe {
    iss: {
        base_calculo: number;
        aliquota: number;
        valor: number;
        retido: boolean;
        codigo_servico: string;
        codigo_municipio: string;
    };
    pis: {
        base_calculo: number;
        aliquota: number;
        valor: number;
    };
    cofins: {
        base_calculo: number;
        aliquota: number;
        valor: number;
    };
    retencoes?: {
        irrf?: { base: number; aliquota: number; valor: number };
        csll?: { base: number; aliquota: number; valor: number };
        inss?: { base: number; aliquota: number; valor: number };
    };
}

// Item da Nota Fiscal
export interface ItemNotaFiscal {
    id?: string;
    sequencia: number;
    tipo: TipoItem;
    
    // Dados do Produto/Serviço
    produto_id?: string;
    servico_id?: string;
    codigo: string;
    descricao: string;
    ncm?: string; // Para produtos
    codigo_servico?: string; // Para serviços
    unidade: string;
    quantidade: number;
    
    // Valores
    valor_unitario: number;
    valor_total: number;
    desconto: number;
    valor_frete?: number;
    valor_seguro?: number;
    valor_outras_despesas?: number;
    
    // Impostos (depende do tipo)
    impostos?: ImpostosItemNFe | ImpostosItemNFSe;
    
    // Dados fiscais
    cfop?: string; // Para produtos
    cst?: string;
    csosn?: string;
    
    // Metadados
    created_at?: string;
    updated_at?: string;
}

// Totais da Nota Fiscal
export interface TotaisNotaFiscal {
    // Produtos
    valor_produtos: number;
    valor_servicos: number;
    valor_descontos: number;
    valor_frete: number;
    valor_seguro: number;
    valor_outras_despesas: number;
    
    // Impostos
    valor_icms: number;
    valor_icms_st: number;
    valor_ipi: number;
    valor_pis: number;
    valor_cofins: number;
    valor_iss: number;
    valor_iss_retido: number;
    
    // Retenções (NFSe)
    valor_irrf?: number;
    valor_csll?: number;
    valor_inss?: number;
    
    // Total
    valor_total: number;
    valor_total_tributos: number;
}

// Dados do Emitente/Destinatário
export interface DadosFiscaisPessoa {
    cpf_cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        municipio: string;
        codigo_municipio: string;
        uf: string;
        cep: string;
        pais?: string;
    };
    contato?: {
        telefone?: string;
        email?: string;
    };
}

// Nota Fiscal Completa
export interface NotaFiscal {
    id?: string;
    company_id: string;
    
    // Identificação
    tipo: TipoNota;
    tipo_operacao: TipoOperacao;
    numero: string;
    serie: string;
    modelo: string; // 55=NFe, SE=NFSe
    chave_acesso?: string;
    
    // Datas
    data_emissao: string;
    data_saida_entrada?: string;
    data_vencimento?: string;
    
    // Emitente e Destinatário
    emitente: DadosFiscaisPessoa;
    destinatario: DadosFiscaisPessoa;
    
    // Dados Fiscais
    natureza_operacao: string;
    cfop?: string; // Para produtos
    finalidade: 'normal' | 'complementar' | 'ajuste' | 'devolucao';
    regime_tributario: RegimeTributario;
    
    // Itens
    itens: ItemNotaFiscal[];
    
    // Totais
    totais: TotaisNotaFiscal;
    
    // Transporte (NFe)
    transporte?: {
        modalidade_frete: string;
        transportador?: DadosFiscaisPessoa;
        veiculo?: {
            placa?: string;
            uf?: string;
            rntc?: string;
        };
    };
    
    // Pagamento (NFe)
    pagamento?: {
        forma: string;
        valor: number;
        vencimento?: string;
    }[];
    
    // Status
    status: StatusNota;
    precisa_validacao_fiscal: boolean;
    
    // XML
    xml_assinado?: string;
    xml_enviado?: string;
    protocolo_autorizacao?: string;
    
    // Metadados
    created_at?: string;
    updated_at?: string;
    created_by?: string;
}

// Resultado do Recalculo
export interface ResultadoRecalculo {
    item_atualizado: ItemNotaFiscal;
    totais_atualizados: TotaisNotaFiscal;
    alteracoes: Array<{
        campo: string;
        valor_anterior: any;
        valor_novo: any;
    }>;
}

// Resultado da Validação
export interface ResultadoValidacao {
    valida: boolean;
    erros: Array<{
        campo: string;
        mensagem: string;
        codigo?: string;
    }>;
    avisos: Array<{
        campo: string;
        mensagem: string;
    }>;
}

// Regra Fiscal
export interface RegraFiscal {
    id: string;
    nome: string;
    tipo: TipoItem;
    operacao: TipoOperacao;
    cfop?: string[];
    cst_permitidos?: CSTICMS[];
    csosn_permitidos?: CSTICMS[];
    ncm_permitidos?: string[];
    calculo_icms: {
        base: 'valor_produto' | 'valor_produto_frete' | 'valor_produto_frete_seguro';
        aliquota_padrao?: number;
        reducao_base?: number;
    };
    calculo_ipi?: {
        base: 'valor_produto' | 'valor_produto_frete';
        aliquota_padrao?: number;
    };
    calculo_pis_cofins: {
        base: 'valor_produto' | 'valor_produto_frete';
        aliquota_pis?: number;
        aliquota_cofins?: number;
    };
    calculo_iss?: {
        aliquota_padrao?: number;
        codigo_servico?: string;
    };
    validacoes: Array<{
        campo: string;
        obrigatorio: boolean;
        formato?: string;
        valores_permitidos?: string[];
    }>;
}

// Log de Alteração Fiscal
export interface FiscalLog {
    id?: string;
    nota_id: string;
    tipo_alteracao: 'recalculo' | 'validacao' | 'geracao_xml' | 'envio' | 'autorizacao' | 'cancelamento';
    campo_alterado?: string;
    valor_anterior?: any;
    valor_novo?: any;
    dados_completos?: any;
    usuario_id?: string;
    data: string;
    observacao?: string;
}
