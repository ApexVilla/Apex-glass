-- ============================================
-- VERIFICAÇÃO: Verificar se migração já foi aplicada
-- ============================================
-- Execute este script PRIMEIRO para verificar o status

-- 1. Verificar se a coluna credit_status existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'credit_status'
    ) THEN '✅ Coluna credit_status EXISTE'
    ELSE '❌ Coluna credit_status NÃO EXISTE - Execute APLICAR-MIGRACAO-CREDITO.sql'
  END as status_credit_status;

-- 2. Verificar se as tabelas existem
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_limits')
    THEN '✅ Tabela credit_limits EXISTE'
    ELSE '❌ Tabela credit_limits NÃO EXISTE'
  END as status_credit_limits,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_logs')
    THEN '✅ Tabela credit_logs EXISTE'
    ELSE '❌ Tabela credit_logs NÃO EXISTE'
  END as status_credit_logs;

-- 3. Verificar se as funções existem
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_credit')
    THEN '✅ Função approve_credit EXISTE'
    ELSE '❌ Função approve_credit NÃO EXISTE'
  END as status_approve_credit,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'requires_credit_analysis')
    THEN '✅ Função requires_credit_analysis EXISTE'
    ELSE '❌ Função requires_credit_analysis NÃO EXISTE'
  END as status_requires_credit_analysis;

-- 4. Se a coluna existe, mostrar estatísticas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    RAISE NOTICE '=== ESTATÍSTICAS DE CRÉDITO ===';
    RAISE NOTICE 'Total de vendas com credit_status = pending: %', 
      (SELECT COUNT(*) FROM public.sales WHERE credit_status = 'pending');
    RAISE NOTICE 'Total de vendas com credit_status = approved: %', 
      (SELECT COUNT(*) FROM public.sales WHERE credit_status = 'approved');
    RAISE NOTICE 'Total de vendas com credit_status = denied: %', 
      (SELECT COUNT(*) FROM public.sales WHERE credit_status = 'denied');
  ELSE
    RAISE NOTICE '⚠️  A migração ainda não foi aplicada!';
    RAISE NOTICE 'Execute o script: APLICAR-MIGRACAO-CREDITO.sql';
  END IF;
END $$;

