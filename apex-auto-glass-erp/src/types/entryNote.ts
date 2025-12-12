export type EntryNoteStatus = 'Rascunho' | 'Em Digitação' | 'Lançada' | 'Cancelada';

export type EntryNoteType =
    | "Compra"
    | "Compra para consumo"
    | "Compra para produção"
    | "Devolução de cliente"
    | "Devolução de fornecedor"
    | "Bonificação"
    | "Garantia"
    | "Industrialização"
    | "Importação direta"
    | "Importação por encomenda"
    | "Importação conta e ordem"
    | "Ajuste"
    | "Complementar"
    | "Transferência filial"
    | "Transferência depósito"
    | "Remessa/Retorno"
    | "Serviço tomado (NFS-e)";

export const ENTRY_NOTE_TYPES: EntryNoteType[] = [
    "Compra",
    "Compra para consumo",
    "Compra para produção",
    "Devolução de cliente",
    "Devolução de fornecedor",
    "Bonificação",
    "Garantia",
    "Industrialização",
    "Importação direta",
    "Importação por encomenda",
    "Importação conta e ordem",
    "Ajuste",
    "Complementar",
    "Transferência filial",
    "Transferência depósito",
    "Remessa/Retorno",
    "Serviço tomado (NFS-e)"
];

export const ENTRY_NOTE_SERIES = [
    "1 - NF Normal",
    "2 - Devolução",
    "3 - Complementar",
    "4 - Remessas",
    "9 - Ajustes",
    "10 - Importação direta",
    "11 - Importação encomenda",
    "12 - Importação conta e ordem",
    "20 - Transferência filiais",
    "21 - Transferência depósitos",
    "30 - Bonificação",
    "31 - Garantia",
    "50 - Serviço",
    "51 - Serviço Tomado",
    "99 - Ajustes/Testes"
];

export interface EntryNoteItem {
    id?: string;
    nf_id?: string;
    produto_id: string;
    codigo_barras?: string; // Not in DB but in UI
    ncm: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    desconto: number;
    total: number;
    impostos: {
        icms: {
            base: number;
            aliquota: number;
            valor: number;
        };
        st_mva: number;
        pis: number;
        cofins: number;
        ipi: number;
    };
    // Campos fiscais (travados - vêm do XML)
    quantidade_fiscal?: number;
    valor_unitario_fiscal?: number;
    valor_total_fiscal?: number;
    unidade_fiscal?: string;
    // Campos internos (editáveis)
    quantidade_interna?: number;
    unidade_interna?: string;
    fator_conversao?: number;
    valor_unitario_interno?: number;
    // Campos adicionais de controle interno
    local_estoque?: string;
    codigo_interno?: string;
    natureza_financeira_id?: string;
    centro_custo_id?: string;
    // Campos de vinculação com fornecedor
    supplier_cnpj?: string; // CNPJ do fornecedor
    supplier_product_code?: string; // cProd do XML
    fiscal_description?: string; // xProd do XML
    gtin?: string; // cEAN do XML
    cest?: string; // CEST do XML
    origem?: string; // Origem da mercadoria
    link_status?: 'pending' | 'linked' | 'created' | 'ignored'; // Status da vinculação
    link_id?: string; // ID do vínculo criado
}

export interface EntryNoteTotals {
    total_produtos: number;
    total_descontos: number;
    total_impostos: number;
    frete: number;
    seguro: number;
    outras_despesas: number;
    valor_total_nf: number;
}

export interface EntryNote {
    id?: string;
    numero: string;
    serie: string;
    tipo_documento: string;
    tipo_entrada: EntryNoteType;
    chave_acesso: string;
    data_emissao: string; // ISO Date
    data_entrada: string; // ISO Date
    fornecedor_id: string;
    cfop: string;
    natureza_operacao: string;
    finalidade: 'Normal' | 'Ajuste' | 'Devolução' | 'Importação';
    tipo_movimentacao?: string; // Optional in DB but in UI
    origem_produto?: string; // Optional in DB but in UI
    status: EntryNoteStatus;
    totais: EntryNoteTotals;
    observacao_interna?: string;
    observacao_fornecedor?: string;
    xml?: string;
    items: EntryNoteItem[];
    company_id?: string;
    created_at?: string;
    updated_at?: string;
}
