-- ============================================
-- TESTE: Verificar se a coluna credit_status existe
-- ============================================
-- Execute este script para verificar se a coluna foi criada

-- 1. Verificar se a coluna existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name = 'credit_status';

-- 2. Se a coluna existir, mostrar algumas vendas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    RAISE NOTICE '✅ Coluna credit_status EXISTE!';
    RAISE NOTICE 'Testando query...';
  ELSE
    RAISE NOTICE '❌ Coluna credit_status NÃO EXISTE!';
    RAISE NOTICE 'Execute o script: CRIAR-COLUNA-CREDIT-STATUS.sql';
  END IF;
END $$;

-- 3. Se existir, mostrar estatísticas
SELECT 
  credit_status,
  COUNT(*) as total
FROM public.sales
GROUP BY credit_status
ORDER BY credit_status;

