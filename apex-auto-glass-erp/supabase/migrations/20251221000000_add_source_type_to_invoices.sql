-- Adiciona campo source_type para distinguir notas de entrada recebidas de fornecedores
-- das notas emitidas pela empresa para clientes
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'fornecedor' 
CHECK (source_type IN ('fornecedor', 'cliente'));

-- Atualiza notas existentes: 
-- - type='entrada' -> source_type='fornecedor' (notas recebidas)
-- - type='saida' -> source_type='cliente' (notas emitidas)
UPDATE public.invoices 
SET source_type = CASE 
  WHEN type = 'entrada' THEN 'fornecedor'
  WHEN type = 'saida' THEN 'cliente'
  ELSE 'fornecedor'
END
WHERE source_type IS NULL OR source_type = 'fornecedor';

-- Comentário explicativo
COMMENT ON COLUMN public.invoices.source_type IS 'Tipo de origem: fornecedor (notas recebidas) ou cliente (notas emitidas)';

