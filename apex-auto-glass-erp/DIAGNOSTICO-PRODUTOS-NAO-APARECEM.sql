-- =====================================================
-- DIAGNÓSTICO: Produtos Não Estão Aparecendo
-- =====================================================
-- Este script verifica possíveis causas dos produtos não aparecerem
-- =====================================================

-- 1. Verificar quantos produtos existem no total
SELECT 
    'Total de produtos no banco' as tipo,
    COUNT(*) as quantidade
FROM public.products;

-- 2. Verificar produtos por status is_active
SELECT 
    COALESCE(is_active::text, 'NULL') as status_is_active,
    COUNT(*) as quantidade
FROM public.products
GROUP BY is_active;

-- 3. Verificar produtos por company_id
SELECT 
    company_id,
    COUNT(*) as quantidade_produtos,
    COUNT(CASE WHEN is_active = true THEN 1 END) as produtos_ativos,
    COUNT(CASE WHEN is_active = false THEN 1 END) as produtos_inativos,
    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as produtos_sem_status
FROM public.products
GROUP BY company_id
ORDER BY quantidade_produtos DESC;

-- 4. Verificar se há produtos sem company_id
SELECT 
    'Produtos sem company_id' as tipo,
    COUNT(*) as quantidade
FROM public.products
WHERE company_id IS NULL;

-- 5. Verificar a função get_user_company_id()
-- (Execute como cada usuário para ver seu company_id)
SELECT 
    auth.uid() as user_id,
    public.get_user_company_id() as company_id;

-- 6. Verificar profiles e seus company_ids
SELECT 
    id as user_id,
    company_id,
    role,
    is_active as profile_ativo
FROM public.profiles
ORDER BY company_id;

-- 7. Verificar se as políticas RLS estão bloqueando produtos
-- Execute como um usuário autenticado para ver o que ele consegue ver:
SELECT 
    COUNT(*) as produtos_visiveis,
    COUNT(CASE WHEN is_active = true THEN 1 END) as produtos_ativos_visiveis,
    COUNT(CASE WHEN is_active = false THEN 1 END) as produtos_inativos_visiveis
FROM public.products;

-- 8. Listar alguns produtos de exemplo com seus dados completos
SELECT 
    id,
    company_id,
    internal_code,
    name,
    is_active,
    created_at
FROM public.products
ORDER BY created_at DESC
LIMIT 10;

-- 9. Verificar se há algum produto com dados corrompidos
SELECT 
    'Produtos sem nome' as problema,
    COUNT(*) as quantidade
FROM public.products
WHERE name IS NULL OR name = '';

SELECT 
    'Produtos sem código interno' as problema,
    COUNT(*) as quantidade
FROM public.products
WHERE internal_code IS NULL OR internal_code = '';

-- 10. CORREÇÃO: Garantir que todos os produtos tenham is_active = true se for NULL
-- Descomente para executar:
/*
UPDATE public.products
SET is_active = true
WHERE is_active IS NULL;
*/

-- 11. CORREÇÃO: Verificar e corrigir produtos sem company_id
-- (Atenção: Isso pode ser perigoso se houver produtos órfãos)
/*
-- Primeiro, ver quais produtos não têm company_id:
SELECT id, internal_code, name, company_id
FROM public.products
WHERE company_id IS NULL;

-- Se necessário, você pode associar a uma empresa específica:
-- UPDATE public.products
-- SET company_id = 'UUID-DA-EMPRESA-AQUI'
-- WHERE company_id IS NULL;
*/

-- 12. Verificar as políticas RLS da tabela products
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
WHERE tablename = 'products';

-- =====================================================
-- SOLUÇÃO TEMPORÁRIA: Ativar todos os produtos
-- =====================================================
-- Se o problema for is_active = false, execute:
/*
UPDATE public.products
SET is_active = true
WHERE is_active = false OR is_active IS NULL;
*/

-- =====================================================
-- VERIFICAÇÃO FINAL: Após correções
-- =====================================================
SELECT 
    'Produtos após correção' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
FROM public.products;

