-- ============================================
-- SCRIPT SIMPLES: Criar apenas a coluna credit_status
-- ============================================
-- Execute este script se a coluna ainda não existe
-- Este é um script mínimo e seguro

-- Verificar e criar a coluna credit_status
DO $$
BEGIN
  -- Verificar se a coluna existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    -- Criar a coluna
    ALTER TABLE public.sales
    ADD COLUMN credit_status TEXT;
    
    -- Definir valor padrão para registros existentes
    UPDATE public.sales
    SET credit_status = 'pending'
    WHERE credit_status IS NULL;
    
    -- Adicionar valor padrão
    ALTER TABLE public.sales
    ALTER COLUMN credit_status SET DEFAULT 'pending';
    
    -- Adicionar constraint
    ALTER TABLE public.sales
    ADD CONSTRAINT sales_credit_status_check 
    CHECK (credit_status IN ('pending', 'approved', 'denied'));
    
    RAISE NOTICE '✅ Coluna credit_status criada com sucesso!';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna credit_status já existe';
  END IF;
END $$;

-- Verificar se foi criada
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'credit_status'
    ) THEN '✅ SUCESSO: Coluna credit_status existe!'
    ELSE '❌ ERRO: Coluna credit_status NÃO foi criada'
  END as resultado;

