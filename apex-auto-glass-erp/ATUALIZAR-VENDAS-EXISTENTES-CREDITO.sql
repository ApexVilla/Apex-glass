-- ============================================
-- SCRIPT: Atualizar Vendas Existentes com Status de Crédito
-- ============================================
-- Execute este script APÓS aplicar a migração APLICAR-MIGRACAO-CREDITO.sql
-- Este script atualiza vendas existentes que deveriam ter status de crédito pendente

-- Verificar se a coluna existe antes de usar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    RAISE EXCEPTION 'A coluna credit_status não existe. Execute primeiro o script APLICAR-MIGRACAO-CREDITO.sql';
  END IF;
END $$;

-- 1. Atualizar credit_status para 'pending' em vendas que:
--    - Têm forma de pagamento que exige análise de crédito
--    - E ainda não têm credit_status definido (NULL)
UPDATE public.sales
SET credit_status = 'pending'
WHERE credit_status IS NULL
  AND payment_method IS NOT NULL
  AND (
    -- Boleto
    LOWER(TRIM(payment_method)) LIKE '%boleto%'
    -- Cartão a prazo
    OR LOWER(TRIM(payment_method)) LIKE '%cartão a prazo%'
    OR LOWER(TRIM(payment_method)) LIKE '%cartao a prazo%'
    OR LOWER(TRIM(payment_method)) LIKE '%cartão a prazo parcelado%'
    -- Crédito interno
    OR LOWER(TRIM(payment_method)) LIKE '%credito interno%'
    OR LOWER(TRIM(payment_method)) LIKE '%crédito interno%'
    OR LOWER(TRIM(payment_method)) = 'credito_loja'
    OR LOWER(TRIM(payment_method)) = 'credito loja'
    -- Duplicata
    OR LOWER(TRIM(payment_method)) LIKE '%duplicata%'
    OR LOWER(TRIM(payment_method)) LIKE '%duplicatas%'
    -- Cheque
    OR LOWER(TRIM(payment_method)) LIKE '%cheque%'
    OR LOWER(TRIM(payment_method)) LIKE '%cheques%'
    -- Prazo
    OR LOWER(TRIM(payment_method)) LIKE '%prazo%'
    -- Parcelado
    OR LOWER(TRIM(payment_method)) LIKE '%parcelado%'
    OR LOWER(TRIM(payment_method)) LIKE '%parcelamento%'
  );

-- 2. Adicionar status C (Crédito) no array status_codes para essas vendas
UPDATE public.sales
SET status_codes = array_append(
  COALESCE(status_codes, '{}'),
  'C'
)
WHERE credit_status = 'pending'
  AND NOT ('C' = ANY(COALESCE(status_codes, '{}')));

-- 3. Verificar quantas vendas foram atualizadas
SELECT 
  COUNT(*) as total_vendas_atualizadas,
  COUNT(DISTINCT customer_id) as clientes_afetados
FROM public.sales
WHERE credit_status = 'pending';

-- 4. Mostrar algumas vendas atualizadas para verificação
SELECT 
  sale_number,
  payment_method,
  credit_status,
  status_codes,
  total,
  created_at
FROM public.sales
WHERE credit_status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

