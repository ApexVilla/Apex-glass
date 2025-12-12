-- Adicionar campo tipo_operacao na tabela sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS tipo_operacao TEXT DEFAULT 'auto' CHECK (tipo_operacao IN ('auto', 'produto', 'servico', 'misto'));

-- Atualizar vendas existentes para 'auto' por padrão
UPDATE public.sales
SET tipo_operacao = 'auto'
WHERE tipo_operacao IS NULL OR tipo_operacao = '';

-- Comentário na coluna
COMMENT ON COLUMN public.sales.tipo_operacao IS 'Tipo de operação: auto (sistema decide), produto (só NFe), servico (só NFS-e), misto (ambas as notas).';

