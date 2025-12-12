-- 🔍 VERIFICAR ESTRUTURA DAS TABELAS
-- Execute este SQL para ver a estrutura real das tabelas

-- 1. Ver estrutura da tabela profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Ver estrutura da tabela companies
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 3. Ver se existe tabela tenants (multi-tenant)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;

