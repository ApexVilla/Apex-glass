-- Migration de segurança para garantir que as colunas ncm e tipo_item existem na tabela products
-- Esta migration garante que as colunas estão presentes mesmo se as migrations anteriores não foram executadas

-- Adicionar coluna ncm se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'ncm'
    ) THEN
        ALTER TABLE public.products ADD COLUMN ncm TEXT;
        RAISE NOTICE 'Coluna ncm adicionada à tabela products';
    ELSE
        RAISE NOTICE 'Coluna ncm já existe na tabela products';
    END IF;
END $$;

-- Adicionar coluna tipo_item se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'tipo_item'
    ) THEN
        ALTER TABLE public.products ADD COLUMN tipo_item TEXT NOT NULL DEFAULT 'produto';
        -- Adicionar constraint se não existir
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'products_tipo_item_check'
        ) THEN
            ALTER TABLE public.products ADD CONSTRAINT products_tipo_item_check 
            CHECK (tipo_item IN ('produto', 'servico'));
        END IF;
        -- Atualizar produtos existentes
        UPDATE public.products SET tipo_item = 'produto' WHERE tipo_item IS NULL OR tipo_item = '';
        RAISE NOTICE 'Coluna tipo_item adicionada à tabela products';
    ELSE
        RAISE NOTICE 'Coluna tipo_item já existe na tabela products';
    END IF;
END $$;

