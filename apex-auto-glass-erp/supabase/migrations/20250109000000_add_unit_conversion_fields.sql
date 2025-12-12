-- Adicionar campos de conversão de unidades na tabela nf_entrada_itens
-- Campos fiscais (travados - vêm do XML)
ALTER TABLE nf_entrada_itens
ADD COLUMN IF NOT EXISTS quantidade_fiscal NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS valor_unitario_fiscal NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS valor_total_fiscal NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS unidade_fiscal TEXT;

-- Campos internos (editáveis)
ALTER TABLE nf_entrada_itens
ADD COLUMN IF NOT EXISTS quantidade_interna NUMERIC(15,4),
ADD COLUMN IF NOT EXISTS unidade_interna TEXT,
ADD COLUMN IF NOT EXISTS fator_conversao NUMERIC(15,6) DEFAULT 1,
ADD COLUMN IF NOT EXISTS valor_unitario_interno NUMERIC(15,4);

-- Campos adicionais para controle interno
ALTER TABLE nf_entrada_itens
ADD COLUMN IF NOT EXISTS local_estoque TEXT,
ADD COLUMN IF NOT EXISTS codigo_interno TEXT,
ADD COLUMN IF NOT EXISTS natureza_financeira_id UUID,
ADD COLUMN IF NOT EXISTS centro_custo_id UUID;

-- Comentários para documentação
COMMENT ON COLUMN nf_entrada_itens.quantidade_fiscal IS 'Quantidade fiscal do XML (travada)';
COMMENT ON COLUMN nf_entrada_itens.valor_unitario_fiscal IS 'Valor unitário fiscal do XML (travado)';
COMMENT ON COLUMN nf_entrada_itens.valor_total_fiscal IS 'Valor total fiscal do XML (travado)';
COMMENT ON COLUMN nf_entrada_itens.unidade_fiscal IS 'Unidade fiscal do XML (travada)';
COMMENT ON COLUMN nf_entrada_itens.quantidade_interna IS 'Quantidade interna para estoque (editável)';
COMMENT ON COLUMN nf_entrada_itens.unidade_interna IS 'Unidade interna para estoque (editável)';
COMMENT ON COLUMN nf_entrada_itens.fator_conversao IS 'Fator de conversão: quantidade_interna / quantidade_fiscal';
COMMENT ON COLUMN nf_entrada_itens.valor_unitario_interno IS 'Valor unitário interno: valor_total_fiscal / quantidade_interna';

-- Atualizar registros existentes: copiar valores atuais para campos fiscais e internos
UPDATE nf_entrada_itens
SET 
    quantidade_fiscal = COALESCE(quantidade_fiscal, quantidade),
    valor_unitario_fiscal = COALESCE(valor_unitario_fiscal, valor_unitario),
    valor_total_fiscal = COALESCE(valor_total_fiscal, total),
    unidade_fiscal = COALESCE(unidade_fiscal, unidade),
    quantidade_interna = COALESCE(quantidade_interna, quantidade),
    unidade_interna = COALESCE(unidade_interna, unidade),
    fator_conversao = CASE 
        WHEN quantidade_fiscal IS NOT NULL AND quantidade_fiscal > 0 
        THEN COALESCE(quantidade_interna, quantidade) / quantidade_fiscal
        ELSE 1
    END,
    valor_unitario_interno = CASE
        WHEN COALESCE(quantidade_interna, quantidade) > 0
        THEN COALESCE(valor_total_fiscal, total) / COALESCE(quantidade_interna, quantidade)
        ELSE COALESCE(valor_unitario_fiscal, valor_unitario)
    END
WHERE quantidade_fiscal IS NULL OR quantidade_interna IS NULL;

