-- =====================================================
-- CORRIGIR VISIBILIDADE DE PRODUTOS
-- =====================================================
-- Este script corrige problemas que podem estar impedindo
-- produtos de aparecerem na aplicação
-- =====================================================

-- 1. Garantir que a função get_user_company_id() existe e está correta
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_user_company_id IS 'Obtém o company_id do usuário autenticado, contornando políticas RLS';

-- 2. Remover políticas antigas de products que possam estar causando problemas
DROP POLICY IF EXISTS "Users can manage products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can view products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can insert products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can update products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can delete products in their company" ON public.products;

-- 3. Recriar políticas RLS de forma mais explícita

-- Política de SELECT (visualizar produtos)
CREATE POLICY "Users can view products in their company"
ON public.products FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR public.get_user_company_id() IS NULL
);

-- Política de INSERT (criar produtos)
CREATE POLICY "Users can insert products in their company"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  OR company_id IS NULL
);

-- Política de UPDATE (atualizar produtos)
CREATE POLICY "Users can update products in their company"
ON public.products FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR public.get_user_company_id() IS NULL
)
WITH CHECK (
  company_id = public.get_user_company_id()
  OR company_id IS NULL
);

-- Política de DELETE (deletar produtos)
CREATE POLICY "Users can delete products in their company"
ON public.products FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR public.get_user_company_id() IS NULL
);

-- 4. Garantir que produtos existentes tenham is_active = true se for NULL
-- (Isso não deve afetar produtos explicitamente marcados como false)
UPDATE public.products
SET is_active = true
WHERE is_active IS NULL;

-- 5. Verificar se há produtos sem company_id e tentar associá-los
-- (Comentado por segurança - descomente apenas se necessário)
/*
DO $$
DECLARE
    v_default_company_id UUID;
BEGIN
    -- Pegar o primeiro company_id disponível (ou usar um específico)
    SELECT id INTO v_default_company_id
    FROM public.companies
    LIMIT 1;
    
    -- Associar produtos órfãos à primeira empresa
    IF v_default_company_id IS NOT NULL THEN
        UPDATE public.products
        SET company_id = v_default_company_id
        WHERE company_id IS NULL;
        
        RAISE NOTICE 'Produtos sem company_id foram associados à empresa: %', v_default_company_id;
    ELSE
        RAISE NOTICE 'Nenhuma empresa encontrada. Produtos sem company_id não foram alterados.';
    END IF;
END $$;
*/

-- 6. Comentários finais
COMMENT ON POLICY "Users can view products in their company" ON public.products IS 
'Permite que usuários vejam produtos da sua empresa. Também permite ver produtos se o usuário não tiver company_id definido (para compatibilidade).';

COMMENT ON POLICY "Users can insert products in their company" ON public.products IS 
'Permite que usuários criem produtos na sua empresa.';

COMMENT ON POLICY "Users can update products in their company" ON public.products IS 
'Permite que usuários atualizem produtos da sua empresa.';

COMMENT ON POLICY "Users can delete products in their company" ON public.products IS 
'Permite que usuários deletem produtos da sua empresa.';

