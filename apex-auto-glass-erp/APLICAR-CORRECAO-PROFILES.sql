-- 🔧 CORREÇÃO RLS PROFILES - Aplicar no Supabase Dashboard
-- Copie e cole este SQL no Supabase Dashboard > SQL Editor > Run

-- Remove a política existente que bloqueia acesso ao próprio profile
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

-- Cria política que permite:
-- 1. Usuários verem seu próprio profile (necessário para login)
-- 2. Usuários verem profiles da mesma empresa
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Permite ver o próprio profile (necessário para login)
  id = auth.uid()
  OR
  -- Permite ver profiles da mesma empresa
  company_id = public.get_user_company_id()
);

