-- Tabela de vínculos entre produtos do fornecedor e produtos internos
CREATE TABLE IF NOT EXISTS supplier_product_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    supplier_cnpj TEXT NOT NULL,
    supplier_product_code TEXT NOT NULL, -- cProd do XML
    internal_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Dados fiscais do produto no fornecedor (snapshot)
    fiscal_description TEXT, -- xProd
    ncm TEXT,
    cest TEXT,
    gtin TEXT, -- cEAN
    fiscal_unit TEXT, -- uCom
    
    -- Status do vínculo
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ignored')),
    
    -- Metadados
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraint: um fornecedor não pode ter o mesmo código de produto vinculado a múltiplos produtos internos
    UNIQUE(company_id, supplier_cnpj, supplier_product_code)
);

-- Índices para performance
CREATE INDEX idx_supplier_product_links_company ON supplier_product_links(company_id);
CREATE INDEX idx_supplier_product_links_supplier ON supplier_product_links(supplier_cnpj);
CREATE INDEX idx_supplier_product_links_product ON supplier_product_links(internal_product_id);
CREATE INDEX idx_supplier_product_links_code ON supplier_product_links(supplier_cnpj, supplier_product_code);
CREATE INDEX idx_supplier_product_links_status ON supplier_product_links(status);

-- Comentários
COMMENT ON TABLE supplier_product_links IS 'Vínculos permanentes entre códigos de produtos do fornecedor e produtos internos do ERP';
COMMENT ON COLUMN supplier_product_links.supplier_cnpj IS 'CNPJ do fornecedor';
COMMENT ON COLUMN supplier_product_links.supplier_product_code IS 'Código do produto no fornecedor (cProd do XML)';
COMMENT ON COLUMN supplier_product_links.internal_product_id IS 'ID do produto interno no ERP';
COMMENT ON COLUMN supplier_product_links.status IS 'Status: active (ativo), inactive (desativado), ignored (ignorado)';

-- Enable RLS
ALTER TABLE supplier_product_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage supplier product links in their company"
ON supplier_product_links
FOR ALL
USING (company_id = get_user_company_id());

-- Trigger para updated_at
CREATE TRIGGER update_supplier_product_links_updated_at
BEFORE UPDATE ON supplier_product_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabela para rastrear status de vinculação dos itens da nota
CREATE TABLE IF NOT EXISTS nf_entrada_item_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nf_item_id UUID REFERENCES nf_entrada_itens(id) ON DELETE CASCADE,
    link_id UUID REFERENCES supplier_product_links(id) ON DELETE SET NULL,
    
    -- Status da vinculação
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'created', 'ignored')),
    
    -- Dados do item do XML (snapshot)
    supplier_cnpj TEXT,
    supplier_product_code TEXT, -- cProd
    fiscal_description TEXT, -- xProd
    ncm TEXT,
    cest TEXT,
    gtin TEXT,
    
    -- Metadados
    linked_at TIMESTAMPTZ,
    linked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(nf_item_id)
);

-- Índices
CREATE INDEX idx_nf_item_status_item ON nf_entrada_item_status(nf_item_id);
CREATE INDEX idx_nf_item_status_link ON nf_entrada_item_status(link_id);
CREATE INDEX idx_nf_item_status_status ON nf_entrada_item_status(status);

-- Enable RLS
ALTER TABLE nf_entrada_item_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage nf item status in their company"
ON nf_entrada_item_status
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM nf_entrada_itens ni
        JOIN nf_entrada nf ON nf.id = ni.nf_id
        WHERE ni.id = nf_item_id
        AND nf.company_id = get_user_company_id()
    )
);

