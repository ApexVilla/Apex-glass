-- Adicionar campo tipo_item na tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS tipo_item TEXT NOT NULL DEFAULT 'produto' CHECK (tipo_item IN ('produto', 'servico'));

-- Atualizar produtos existentes para 'produto' por padrão (caso já existam)
UPDATE public.products
SET tipo_item = 'produto'
WHERE tipo_item IS NULL OR tipo_item = '';

-- Comentário na coluna
COMMENT ON COLUMN public.products.tipo_item IS 'Tipo do item: produto ou servico. Usado para determinar se deve gerar NFe ou NFS-e.';

