-- 🔧 CORREÇÃO COMPLETA RLS - Aplicar no Supabase Dashboard
-- Copie e cole este SQL no Supabase Dashboard > SQL Editor > Run
-- Isso corrige os problemas de busca de empresas e profiles

-- ============================================
-- 1. CORRIGIR POLÍTICA DE COMPANIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company or search by name" ON public.companies;

CREATE POLICY "Users can view their company or search by name"
ON public.companies FOR SELECT
TO authenticated
USING (
  id = public.get_user_company_id()
  OR
  true
);

-- ============================================
-- 2. CORRIGIR POLÍTICA DE PROFILES
-- ============================================
-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Política única que permite:
-- 1. Ver o próprio profile (necessário para login)
-- 2. Ver profiles da mesma empresa (usando função SECURITY DEFINER que bypassa RLS)
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
TO authenticated
USING (
  -- Permite ver o próprio profile (evita dependência circular)
  id = auth.uid()
  OR
  -- Permite ver profiles da mesma empresa usando a função (que é SECURITY DEFINER)
  company_id = public.get_user_company_id()
);

