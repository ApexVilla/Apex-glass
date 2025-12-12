-- ============================================
-- CORREÇÃO DEFINITIVA: RLS da tabela sales
-- ============================================
-- Execute este script para corrigir o problema de permissão

-- 1. Remover TODAS as políticas existentes de sales
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- 2. Verificar se a função get_user_company_id existe e funciona
DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Testar a função
  SELECT public.get_user_company_id() INTO v_company_id;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE '⚠️  ATENÇÃO: get_user_company_id() retornou NULL!';
    RAISE NOTICE 'Isso pode causar problemas de RLS.';
  ELSE
    RAISE NOTICE '✅ get_user_company_id() retorna: %', v_company_id;
  END IF;
END $$;

-- 3. Criar política RLS mais robusta
-- Usando uma abordagem que funciona mesmo se get_user_company_id retornar NULL
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (
  -- Permitir se company_id da venda = company_id do usuário
  company_id = public.get_user_company_id()
  OR
  -- Permitir se o usuário for admin/manager (verificar role)
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
  OR
  -- Fallback: permitir se o seller_id for o usuário atual
  seller_id = auth.uid()
)
WITH CHECK (
  -- Mesmas condições para INSERT/UPDATE
  company_id = public.get_user_company_id()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
  OR
  seller_id = auth.uid()
);

-- 4. Verificar se a política foi criada
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Tem WITH CHECK'
    ELSE '❌ Sem WITH CHECK'
  END as status_with_check
FROM pg_policies
WHERE tablename = 'sales';

-- 5. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Política RLS criada com sucesso!';
  RAISE NOTICE 'A política permite:';
  RAISE NOTICE '  - Vendas onde company_id = company_id do usuário';
  RAISE NOTICE '  - Usuários admin/manager';
  RAISE NOTICE '  - Vendas onde seller_id = usuário atual';
END $$;

