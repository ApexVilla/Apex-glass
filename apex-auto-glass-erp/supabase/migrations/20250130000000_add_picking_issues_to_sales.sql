-- Adicionar campo para armazenar detalhes dos problemas de separação
-- Isso permite que o vendedor saiba exatamente o que está errado quando o pedido volta do estoque

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS picking_issues JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.sales.picking_issues IS 'Detalhes dos problemas encontrados durante a separação: itens faltando, avariados, etc. Formato JSON: { "missing": [...], "damaged": [...], "partial": [...] }';

-- Criar índice para buscas mais rápidas
CREATE INDEX IF NOT EXISTS idx_sales_picking_issues ON public.sales USING GIN (picking_issues) WHERE picking_issues IS NOT NULL;

