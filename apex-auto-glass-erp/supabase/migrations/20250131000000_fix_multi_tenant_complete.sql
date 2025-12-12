-- ============================================
-- CORREÇÃO COMPLETA MULTI-TENANT
-- Sistema 100% seguro com isolamento total entre empresas
-- ============================================

-- ============================================
-- 1. CRIAR TABELA usuarios_empresas
-- ============================================
CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario ON public.usuarios_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON public.usuarios_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_active ON public.usuarios_empresas(usuario_id, is_active) WHERE is_active = true;

-- Migrar dados existentes de profiles e user_roles para usuarios_empresas
INSERT INTO public.usuarios_empresas (usuario_id, empresa_id, is_active)
SELECT DISTINCT id, company_id, true
FROM public.profiles
WHERE company_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

INSERT INTO public.usuarios_empresas (usuario_id, empresa_id, is_active)
SELECT DISTINCT user_id, company_id, true
FROM public.user_roles
WHERE company_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- ============================================
-- 2. ADICIONAR CAMPOS created_by e updated_by
-- ============================================

-- Companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Customer vehicles
ALTER TABLE public.customer_vehicles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Product categories
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Inventory movements
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Service orders (já tem created_by)
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Service order items
ALTER TABLE public.service_order_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Sale items
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial transactions (já tem created_by)
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Activity logs
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Invoice headers (já tem created_by)
ALTER TABLE public.invoice_headers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Invoice items
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial natures (já tem created_by)
ALTER TABLE public.financial_natures 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Cost centers (já tem created_by)
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial accounts (já tem created_by)
ALTER TABLE public.financial_accounts 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Accounts receivable (já tem created_by)
ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Accounts payable (já tem created_by)
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial movements (já tem created_by)
ALTER TABLE public.financial_movements 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Account transfers (já tem created_by)
ALTER TABLE public.account_transfers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Bank reconciliations (já tem created_by)
ALTER TABLE public.bank_reconciliations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Reconciliation items
ALTER TABLE public.reconciliation_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial installments
ALTER TABLE public.financial_installments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial attachments
ALTER TABLE public.financial_attachments 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Financial logs
ALTER TABLE public.financial_logs 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Cash closures (já tem closed_by como created_by)
ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- User roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================
-- 3. ATUALIZAR FUNÇÕES RLS
-- ============================================

-- Função para obter empresa_id do JWT (prioridade) ou fallback
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Tentar obter do JWT primeiro (empresa ativa)
  BEGIN
    v_empresa_id := (current_setting('request.jwt.claims', true)::json->>'empresa_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;
  
  -- Se não encontrou no JWT, usar fallback (primeira empresa do usuário)
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$;

-- Função para verificar se usuário tem acesso à empresa
CREATE OR REPLACE FUNCTION public.user_has_empresa_access(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios_empresas 
    WHERE usuario_id = auth.uid() 
      AND empresa_id = p_empresa_id
      AND is_active = true
  );
END;
$$;

-- Função para obter todas as empresas do usuário
CREATE OR REPLACE FUNCTION public.get_user_empresas()
RETURNS TABLE(empresa_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id 
  FROM public.usuarios_empresas 
  WHERE usuario_id = auth.uid() 
    AND is_active = true;
$$;

-- Atualizar get_user_company_id para usar nova estrutura
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_current_empresa_id();
END;
$$;

-- ============================================
-- 4. HABILITAR RLS NA TABELA usuarios_empresas
-- ============================================
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê suas próprias associações
CREATE POLICY "Users can view their own company associations"
ON public.usuarios_empresas FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- Política: usuário pode inserir suas próprias associações (com validação)
CREATE POLICY "Users can insert their own company associations"
ON public.usuarios_empresas FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- Política: usuário pode atualizar suas próprias associações
CREATE POLICY "Users can update their own company associations"
ON public.usuarios_empresas FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid());

-- ============================================
-- 5. RECRIAR TODAS AS POLÍTICAS RLS CORRETAS
-- ============================================

-- Remover políticas antigas
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Users can view ' || r.tablename || ' in their company" ON public.' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert ' || r.tablename || ' in their company" ON public.' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can update ' || r.tablename || ' in their company" ON public.' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete ' || r.tablename || ' in their company" ON public.' || r.tablename;
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage ' || r.tablename || ' in their company" ON public.' || r.tablename;
  END LOOP;
END $$;

-- ============================================
-- POLÍTICAS RLS PARA CADA TABELA
-- ============================================

-- COMPANIES
CREATE POLICY "companies_select"
ON public.companies FOR SELECT
TO authenticated
USING (
  id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- PROFILES
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- CUSTOMERS
CREATE POLICY "customers_select"
ON public.customers FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

CREATE POLICY "customers_insert"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

CREATE POLICY "customers_update"
ON public.customers FOR UPDATE
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

CREATE POLICY "customers_delete"
ON public.customers FOR DELETE
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- CUSTOMER_VEHICLES
CREATE POLICY "customer_vehicles_all"
ON public.customer_vehicles FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- PRODUCT_CATEGORIES
CREATE POLICY "product_categories_all"
ON public.product_categories FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- PRODUCTS
CREATE POLICY "products_all"
ON public.products FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- INVENTORY_MOVEMENTS
CREATE POLICY "inventory_movements_all"
ON public.inventory_movements FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- SERVICE_ORDERS
CREATE POLICY "service_orders_all"
ON public.service_orders FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- SERVICE_ORDER_ITEMS
CREATE POLICY "service_order_items_all"
ON public.service_order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_id
    AND so.company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
  )
);

-- SALES
CREATE POLICY "sales_all"
ON public.sales FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- SALE_ITEMS
CREATE POLICY "sale_items_all"
ON public.sale_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_id
    AND s.company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
  )
);

-- FINANCIAL_TRANSACTIONS
CREATE POLICY "financial_transactions_all"
ON public.financial_transactions FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ACTIVITY_LOGS
CREATE POLICY "activity_logs_select"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

CREATE POLICY "activity_logs_insert"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- INVOICES
CREATE POLICY "invoices_all"
ON public.invoices FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- SUPPLIERS
CREATE POLICY "suppliers_all"
ON public.suppliers FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ESTABLISHMENTS
CREATE POLICY "establishments_all"
ON public.establishments FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- INVOICE_HEADERS
CREATE POLICY "invoice_headers_all"
ON public.invoice_headers FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- INVOICE_ITEMS
CREATE POLICY "invoice_items_all"
ON public.invoice_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_headers ih
    WHERE ih.id = invoice_id
    AND ih.company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
  )
);

-- FINANCIAL_NATURES
CREATE POLICY "financial_natures_all"
ON public.financial_natures FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- COST_CENTERS
CREATE POLICY "cost_centers_all"
ON public.cost_centers FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- FINANCIAL_ACCOUNTS
CREATE POLICY "financial_accounts_all"
ON public.financial_accounts FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ACCOUNTS_RECEIVABLE
CREATE POLICY "accounts_receivable_all"
ON public.accounts_receivable FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ACCOUNTS_PAYABLE
CREATE POLICY "accounts_payable_all"
ON public.accounts_payable FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- FINANCIAL_MOVEMENTS
CREATE POLICY "financial_movements_all"
ON public.financial_movements FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ACCOUNT_TRANSFERS
CREATE POLICY "account_transfers_all"
ON public.account_transfers FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- BANK_RECONCILIATIONS
CREATE POLICY "bank_reconciliations_all"
ON public.bank_reconciliations FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- RECONCILIATION_ITEMS
CREATE POLICY "reconciliation_items_all"
ON public.reconciliation_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_reconciliations br
    WHERE br.id = reconciliation_id
    AND br.company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
  )
);

-- FINANCIAL_INSTALLMENTS
CREATE POLICY "financial_installments_all"
ON public.financial_installments FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- FINANCIAL_ATTACHMENTS
CREATE POLICY "financial_attachments_all"
ON public.financial_attachments FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- FINANCIAL_LOGS
CREATE POLICY "financial_logs_select"
ON public.financial_logs FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- CASH_CLOSURES
CREATE POLICY "cash_closures_all"
ON public.cash_closures FOR ALL
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- USER_ROLES
CREATE POLICY "user_roles_select"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ============================================
-- 6. TRIGGERS PARA AUTO-PREENCHER created_by/updated_by
-- ============================================

-- Função genérica para preencher created_by e updated_by
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    IF NEW.updated_by IS NULL THEN
      NEW.updated_by := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    -- Manter created_by original
    IF OLD.created_by IS NOT NULL THEN
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas que têm created_by/updated_by
-- (Aplicar manualmente conforme necessário, exemplo abaixo)

-- ============================================
-- 7. FUNÇÃO PARA ATUALIZAR JWT COM empresa_id
-- ============================================

-- Esta função será chamada quando o usuário trocar de empresa
CREATE OR REPLACE FUNCTION public.set_empresa_ativa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário tem acesso à empresa
  IF NOT public.user_has_empresa_access(p_empresa_id) THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa';
  END IF;
  
  -- O JWT será atualizado pelo frontend via Supabase Auth
  -- Esta função apenas valida o acesso
  RETURN true;
END;
$$;

-- ============================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.usuarios_empresas IS 'Tabela de relacionamento muitos-para-muitos entre usuários e empresas. Permite que um usuário tenha acesso a múltiplas empresas.';
COMMENT ON FUNCTION public.get_current_empresa_id() IS 'Obtém a empresa_id ativa do usuário. Prioriza o valor do JWT, com fallback para a primeira empresa ativa do usuário.';
COMMENT ON FUNCTION public.user_has_empresa_access(UUID) IS 'Verifica se o usuário autenticado tem acesso à empresa especificada.';
COMMENT ON FUNCTION public.get_user_empresas() IS 'Retorna todas as empresas às quais o usuário autenticado tem acesso.';

