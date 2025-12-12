-- ============================================
-- PERMITIR SALVAR VENDAS: Política RLS Permissiva
-- ============================================
-- Execute este script no Supabase SQL Editor

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow users to view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to delete sales in their company" ON public.sales;

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICA PERMISSIVA PARA INSERT (SALVAR VENDAS)
CREATE POLICY "Allow authenticated users to insert sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id
  )
);

-- 4. CRIAR POLÍTICA PARA SELECT (VER VENDAS)
CREATE POLICY "Allow users to view sales in their company"
ON public.sales FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

-- 5. CRIAR POLÍTICA PARA UPDATE (EDITAR VENDAS)
CREATE POLICY "Allow users to update sales in their company"
ON public.sales FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  company_id = public.get_user_company_id()
  OR seller_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

-- 6. CRIAR POLÍTICA PARA DELETE (DELETAR VENDAS)
CREATE POLICY "Allow users to delete sales in their company"
ON public.sales FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

-- 7. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
SELECT 
  policyname,
  cmd as operacao,
  CASE 
    WHEN cmd = 'INSERT' AND with_check IS NOT NULL THEN 'OK INSERT permitido'
    WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN 'OK SELECT permitido'
    WHEN cmd = 'UPDATE' AND with_check IS NOT NULL THEN 'OK UPDATE permitido'
    WHEN cmd = 'DELETE' AND qual IS NOT NULL THEN 'OK DELETE permitido'
    ELSE 'Verificar'
  END as status
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY cmd;

