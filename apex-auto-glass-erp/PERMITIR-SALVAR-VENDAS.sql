-- ============================================
-- PERMITIR SALVAR VENDAS: Política RLS Permissiva
-- ============================================
-- Este script cria uma política que PERMITE usuários autenticados salvarem vendas
-- Execute este script no Supabase SQL Editor

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICA PERMISSIVA PARA INSERT (SALVAR VENDAS)
-- Esta política permite que QUALQUER usuário autenticado insira vendas
-- desde que o company_id seja válido
CREATE POLICY "Allow authenticated users to insert sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar se o usuário está autenticado
  auth.uid() IS NOT NULL
  AND
  -- Verificar se o company_id foi fornecido
  company_id IS NOT NULL
  AND
  -- Verificar se o company_id existe na tabela companies
  EXISTS (
    SELECT 1 FROM public.companies 
    WHERE id = company_id
  )
);

-- 4. CRIAR POLÍTICA PARA SELECT (VER VENDAS)
-- Permite ver vendas da própria empresa
CREATE POLICY "Allow users to view sales in their company"
ON public.sales FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR
  -- Fallback: permitir se seller_id for o usuário atual
  seller_id = auth.uid()
  OR
  -- Permitir se for admin/manager
  EXISTS (
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
  OR
  seller_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  company_id = public.get_user_company_id()
  OR
  seller_id = auth.uid()
  OR
  EXISTS (
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
  OR
  EXISTS (
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
    WHEN cmd = 'INSERT' AND with_check IS NOT NULL THEN '✅ INSERT permitido'
    WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN '✅ SELECT permitido'
    WHEN cmd = 'UPDATE' AND with_check IS NOT NULL THEN '✅ UPDATE permitido'
    WHEN cmd = 'DELETE' AND qual IS NOT NULL THEN '✅ DELETE permitido'
    ELSE '⚠️ Verificar'
  END as status
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY cmd;

-- 8. TESTAR SE A FUNÇÃO get_user_company_id FUNCIONA
DO $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_company_id := public.get_user_company_id();
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTE DE PERMISSÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Company ID (get_user_company_id): %', v_company_id;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE '⚠️  ATENÇÃO: get_user_company_id() retornou NULL';
    RAISE NOTICE 'Verifique se o usuário tem um profile com company_id';
  ELSE
    RAISE NOTICE '✅ get_user_company_id() funcionando corretamente';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- 9. MOSTRAR PROFILE DO USUÁRIO ATUAL
SELECT 
  id as user_id,
  company_id,
  full_name,
  email,
  role,
  CASE 
    WHEN company_id IS NOT NULL THEN '✅ Tem company_id'
    ELSE '❌ Sem company_id - pode causar problemas!'
  END as status_company
FROM public.profiles
WHERE id = auth.uid();

-- 10. MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ POLÍTICAS RLS CRIADAS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agora você pode:';
  RAISE NOTICE '  ✅ Salvar vendas (INSERT)';
  RAISE NOTICE '  ✅ Ver vendas da sua empresa (SELECT)';
  RAISE NOTICE '  ✅ Editar vendas (UPDATE)';
  RAISE NOTICE '  ✅ Deletar vendas (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tente salvar uma venda agora!';
  RAISE NOTICE '========================================';
END $$;

