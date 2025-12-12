-- Tabela para armazenar XMLs de notas fiscais
CREATE TABLE IF NOT EXISTS notas_xml (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT NOT NULL UNIQUE,
    xml TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    nf_entrada_id UUID REFERENCES nf_entrada(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para itens dos XMLs
CREATE TABLE IF NOT EXISTS notas_xml_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_xml UUID REFERENCES notas_xml(id) ON DELETE CASCADE NOT NULL,
    codigo TEXT,
    descricao TEXT NOT NULL,
    ncm TEXT,
    unidade TEXT,
    quantidade NUMERIC NOT NULL,
    valor_unit NUMERIC NOT NULL,
    valor_total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs de operações SEFAZ
CREATE TABLE IF NOT EXISTS sefaz_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operacao TEXT NOT NULL, -- 'consulta', 'manifestacao', 'distribuicao', 'download_xml'
    chave TEXT,
    resposta JSONB,
    status TEXT NOT NULL, -- 'sucesso', 'erro', 'pendente'
    data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    mensagem_erro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações fiscais
CREATE TABLE IF NOT EXISTS fiscal_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
    certificado_pfx BYTEA, -- Certificado A1 em formato .pfx
    senha_certificado TEXT,
    cnpj TEXT,
    uf TEXT,
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    ultimo_nsu TEXT DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notas_xml_chave ON notas_xml(chave);
CREATE INDEX IF NOT EXISTS idx_notas_xml_company ON notas_xml(company_id);
CREATE INDEX IF NOT EXISTS idx_notas_xml_itens_xml ON notas_xml_itens(id_xml);
CREATE INDEX IF NOT EXISTS idx_sefaz_logs_chave ON sefaz_logs(chave);
CREATE INDEX IF NOT EXISTS idx_sefaz_logs_company ON sefaz_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sefaz_logs_data ON sefaz_logs(data);

-- Enable RLS
ALTER TABLE notas_xml ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_xml_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sefaz_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_config ENABLE ROW LEVEL SECURITY;

-- Policies para notas_xml
CREATE POLICY "Users can manage XMLs in their company" ON notas_xml
    FOR ALL USING (company_id = get_user_company_id());

-- Policies para notas_xml_itens
CREATE POLICY "Users can view XML items in their company" ON notas_xml_itens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notas_xml
            WHERE notas_xml.id = notas_xml_itens.id_xml
            AND notas_xml.company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can insert XML items in their company" ON notas_xml_itens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notas_xml
            WHERE notas_xml.id = notas_xml_itens.id_xml
            AND notas_xml.company_id = get_user_company_id()
        )
    );

-- Policies para sefaz_logs
CREATE POLICY "Users can manage SEFAZ logs in their company" ON sefaz_logs
    FOR ALL USING (company_id = get_user_company_id());

-- Policies para fiscal_config
CREATE POLICY "Users can manage fiscal config in their company" ON fiscal_config
    FOR ALL USING (company_id = get_user_company_id());

-- Trigger para updated_at em fiscal_config
CREATE OR REPLACE FUNCTION update_fiscal_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fiscal_config_updated_at
    BEFORE UPDATE ON fiscal_config
    FOR EACH ROW
    EXECUTE FUNCTION update_fiscal_config_updated_at();

