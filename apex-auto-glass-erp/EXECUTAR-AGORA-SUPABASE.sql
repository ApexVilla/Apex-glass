-- ============================================
-- CORRIGIR RLS PARA PERMITIR SALVAR VENDAS
-- ============================================
-- Copie e cole TODO este script no Supabase SQL Editor

-- 1. Remover todas as politicas antigas
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow users to view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to delete sales in their company" ON public.sales;

-- 2. Garantir que RLS esta habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. Criar politica para INSERT (SALVAR VENDAS)
CREATE POLICY "Allow authenticated users to insert sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id)
);

-- 4. Criar politica para SELECT (VER VENDAS)
CREATE POLICY "Allow users to view sales in their company"
ON public.sales FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
);

-- 5. Criar politica para UPDATE (EDITAR VENDAS)
CREATE POLICY "Allow users to update sales in their company"
ON public.sales FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
)
WITH CHECK (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
);

-- 6. Criar politica para DELETE (DELETAR VENDAS)
CREATE POLICY "Allow users to delete sales in their company"
ON public.sales FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
);

-- 7. Verificar se as politicas foram criadas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'OK - Permite salvar vendas'
    WHEN cmd = 'SELECT' THEN 'OK - Permite ver vendas'
    WHEN cmd = 'UPDATE' THEN 'OK - Permite editar vendas'
    WHEN cmd = 'DELETE' THEN 'OK - Permite deletar vendas'
    ELSE 'Verificar'
  END as status
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY cmd;

