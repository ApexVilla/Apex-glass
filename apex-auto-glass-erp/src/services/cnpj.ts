
export interface CnpjResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    cnae_fiscal: number;
    cnae_fiscal_descricao: string;
    descricao_situacao_cadastral: string;
    data_situacao_cadastral: string;
    motivo_situacao_cadastral: number;
    nome_cidade_exterior: string;
    codigo_natureza_juridica: number;
    data_inicio_atividade: string;
    cnaes_secundarios: Array<{
        codigo: number;
        descricao: string;
    }>;
    qsa: Array<{
        identificador_de_socio: number;
        nome_socio: string;
        cnpj_cpf_do_socio: string;
        codigo_qualificacao_socio: number;
        percentual_capital_social: number;
        data_entrada_sociedade: string;
    }>;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    ddd_telefone_1: string;
    ddd_telefone_2: string;
    opcao_pelo_simples: boolean;
    data_opcao_pelo_simples: string;
    data_exclusao_do_simples: string;
    opcao_pelo_mei: boolean;
    situacao_especial: string;
    data_situacao_especial: string;
}

export const fetchCompanyByCnpj = async (cnpj: string): Promise<CnpjResponse | null> => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return null;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching CNPJ:', error);
        return null;
    }
};
