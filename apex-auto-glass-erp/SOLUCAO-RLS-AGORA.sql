-- ============================================
-- SOLUÇÃO IMEDIATA: Corrigir RLS para permitir INSERT
-- ============================================
-- Execute este script AGORA no Supabase

-- 1. Remover política antiga (que não tem WITH CHECK)
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- 2. Criar política CORRETA com USING e WITH CHECK
-- O WITH CHECK é ESSENCIAL para INSERT funcionar!
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 3. Verificar se foi criada corretamente
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL AND with_check != '' THEN '✅ CORRETO: Tem WITH CHECK'
    ELSE '❌ ERRO: Sem WITH CHECK - INSERT não funcionará!'
  END as status
FROM pg_policies
WHERE tablename = 'sales';

-- 4. Testar a função get_user_company_id
SELECT 
  public.get_user_company_id() as company_id_do_usuario,
  auth.uid() as id_do_usuario,
  CASE 
    WHEN public.get_user_company_id() IS NOT NULL THEN '✅ Função retorna valor'
    ELSE '❌ Função retorna NULL - pode causar problemas!'
  END as status_funcao;

-- 5. Mostrar profile do usuário atual
SELECT 
  id,
  company_id,
  full_name,
  role
FROM public.profiles
WHERE id = auth.uid();

