-- ============================================
-- DEBUG: Verificar problema de RLS na tabela sales
-- ============================================

-- 1. Verificar função get_user_company_id
SELECT 
  public.get_user_company_id() as company_id_atual,
  auth.uid() as user_id_atual;

-- 2. Verificar profile do usuário atual
SELECT 
  id,
  company_id,
  full_name,
  email
FROM public.profiles
WHERE id = auth.uid();

-- 3. Verificar políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY policyname;

-- 4. Testar se a política está funcionando
-- Esta query deve retornar TRUE se a política permitir
SELECT 
  'd53dd0ae-85ac-44e1-ac4e-cd75054d9ff8'::uuid = public.get_user_company_id() as politica_deve_permitir;

