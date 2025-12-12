-- 🔍 VERIFICAR E CORRIGIR ESTRUTURA DA TABELA PROFILES
-- Execute este SQL no Supabase Dashboard

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE EXISTE tenant_id (multi-tenant)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('company_id', 'tenant_id');

-- 3. SE NÃO EXISTIR company_id, ADICIONAR A COLUNA
-- Descomente e execute se necessário:
/*
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
*/

-- 4. VERIFICAR SE EXISTE DADOS NA TABELA
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 5. VER TODOS OS PROFILES (sem JOIN primeiro)
SELECT * FROM public.profiles LIMIT 10;

