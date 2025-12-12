-- 🔧 CORREÇÃO RÁPIDA - Aplicar no Supabase Dashboard
-- Copie e cole este SQL no Supabase Dashboard > SQL Editor > Run

-- ============================================
-- 1. CORREÇÃO: Tabela companies
-- ============================================
-- Remove TODAS as políticas existentes da tabela companies
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company or search by name" ON public.companies;

-- Cria política que permite buscar empresas por nome
-- Necessário para login quando acessado via IP
CREATE POLICY "Users can view their company or search by name"
ON public.companies FOR SELECT
TO authenticated
USING (
  -- Permite ver a própria empresa
  id = public.get_user_company_id()
  OR
  -- Permite buscar empresas (app valida acesso depois)
  true
);

-- ============================================
-- 2. CORREÇÃO: Tabela sales (PERMITE GERAR VENDAS)
-- ============================================
-- O problema era que a política RLS tinha apenas USING, que funciona para SELECT/UPDATE/DELETE
-- mas para INSERT é necessário WITH CHECK

-- Remove a política existente
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- Recria a política com USING e WITH CHECK
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- ============================================
-- 3. CORREÇÃO: Tabela sale_items (PERMITE INSERIR ITENS)
-- ============================================
-- Também corrige a política de sale_items para garantir que funciona corretamente
DROP POLICY IF EXISTS "Users can manage sale items" ON public.sale_items;

CREATE POLICY "Users can manage sale items"
ON public.sale_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = public.get_user_company_id()
  )
);

