-- 🔧 CORREÇÃO URGENTE - Aplicar AGORA no Supabase Dashboard
-- Copie e cole este SQL no Supabase Dashboard > SQL Editor > Run

-- ============================================
-- 1. CORRIGIR POLÍTICA DE PROFILES (PRIORIDADE)
-- ============================================
-- Remove TODAS as políticas existentes de profiles
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Cria política SIMPLES que permite ver o próprio profile
-- Isso é ESSENCIAL para o login funcionar
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Política adicional para ver profiles da mesma empresa
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL 
  AND company_id = (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- ============================================
-- 2. CORRIGIR POLÍTICA DE COMPANIES
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

