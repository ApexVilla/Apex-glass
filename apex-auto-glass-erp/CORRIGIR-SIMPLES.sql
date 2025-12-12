-- ============================================
-- CORREÇÃO SIMPLES: Criar coluna e corrigir RLS
-- ============================================
-- Execute este script no Supabase SQL Editor

-- 1. CRIAR COLUNA credit_status
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'pending';

-- 2. Adicionar constraint (remover se existir)
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_credit_status_check;

ALTER TABLE public.sales
ADD CONSTRAINT sales_credit_status_check 
CHECK (credit_status IN ('pending', 'approved', 'denied'));

-- 3. Atualizar registros existentes
UPDATE public.sales
SET credit_status = 'pending'
WHERE credit_status IS NULL;

-- 4. CORRIGIR RLS DA TABELA SALES
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 5. Verificar se funcionou
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'sales' AND column_name = 'credit_status'
    ) THEN '✅ SUCESSO: Coluna credit_status criada!'
    ELSE '❌ ERRO: Coluna não foi criada'
  END as resultado;

