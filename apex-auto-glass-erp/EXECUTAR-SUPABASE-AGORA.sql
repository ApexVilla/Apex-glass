-- ============================================
-- SCRIPT COMPLETO MULTI-TENANT - EXECUTAR NO SUPABASE SQL EDITOR
-- Copie e cole este script completo no SQL Editor do Supabase
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

-- Migrar dados existentes
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

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.customer_vehicles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.service_order_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.invoice_headers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_natures 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_accounts 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_movements 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.account_transfers 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.bank_reconciliations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.reconciliation_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_installments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_attachments 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.financial_logs 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.cash_closures 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================
-- 3. FUNÇÕES RLS ATUALIZADAS
-- ============================================

-- Função para obter empresa_id do JWT ou fallback
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
  -- Tentar obter do JWT primeiro
  BEGIN
    v_empresa_id := (current_setting('request.jwt.claims', true)::json->>'empresa_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;
  
  -- Fallback: primeira empresa ativa do usuário
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

-- Função para verificar acesso à empresa
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

-- Atualizar get_user_company_id
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
-- 4. HABILITAR RLS NA usuarios_empresas
-- ============================================
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can view their own company associations"
ON public.usuarios_empresas FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can insert their own company associations"
ON public.usuarios_empresas FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can update their own company associations"
ON public.usuarios_empresas FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid());

-- ============================================
-- 5. REMOVER POLÍTICAS ANTIGAS
-- ============================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can insert ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can delete ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can manage ' || r.tablename || ' in their company', r.tablename);
  END LOOP;
END $$;

-- ============================================
-- 6. CRIAR POLÍTICAS RLS CORRETAS
-- ============================================

-- COMPANIES
DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select"
ON public.companies FOR SELECT
TO authenticated
USING (
  id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select"
ON public.customers FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update"
ON public.customers FOR UPDATE
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete"
ON public.customers FOR DELETE
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- CUSTOMER_VEHICLES
DROP POLICY IF EXISTS "customer_vehicles_all" ON public.customer_vehicles;
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
DROP POLICY IF EXISTS "product_categories_all" ON public.product_categories;
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
DROP POLICY IF EXISTS "products_all" ON public.products;
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
DROP POLICY IF EXISTS "inventory_movements_all" ON public.inventory_movements;
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
DROP POLICY IF EXISTS "service_orders_all" ON public.service_orders;
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
DROP POLICY IF EXISTS "service_order_items_all" ON public.service_order_items;
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
DROP POLICY IF EXISTS "sales_all" ON public.sales;
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
DROP POLICY IF EXISTS "sale_items_all" ON public.sale_items;
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
DROP POLICY IF EXISTS "financial_transactions_all" ON public.financial_transactions;
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
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_current_empresa_id()
  AND company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- INVOICES
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
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
DROP POLICY IF EXISTS "suppliers_all" ON public.suppliers;
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
DROP POLICY IF EXISTS "establishments_all" ON public.establishments;
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
DROP POLICY IF EXISTS "invoice_headers_all" ON public.invoice_headers;
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
DROP POLICY IF EXISTS "invoice_items_all" ON public.invoice_items;
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
DROP POLICY IF EXISTS "financial_natures_all" ON public.financial_natures;
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
DROP POLICY IF EXISTS "cost_centers_all" ON public.cost_centers;
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
DROP POLICY IF EXISTS "financial_accounts_all" ON public.financial_accounts;
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
DROP POLICY IF EXISTS "accounts_receivable_all" ON public.accounts_receivable;
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
DROP POLICY IF EXISTS "accounts_payable_all" ON public.accounts_payable;
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
DROP POLICY IF EXISTS "financial_movements_all" ON public.financial_movements;
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
DROP POLICY IF EXISTS "account_transfers_all" ON public.account_transfers;
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
DROP POLICY IF EXISTS "bank_reconciliations_all" ON public.bank_reconciliations;
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
DROP POLICY IF EXISTS "reconciliation_items_all" ON public.reconciliation_items;
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
DROP POLICY IF EXISTS "financial_installments_all" ON public.financial_installments;
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
DROP POLICY IF EXISTS "financial_attachments_all" ON public.financial_attachments;
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
DROP POLICY IF EXISTS "financial_logs_select" ON public.financial_logs;
CREATE POLICY "financial_logs_select"
ON public.financial_logs FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- CASH_CLOSURES
DROP POLICY IF EXISTS "cash_closures_all" ON public.cash_closures;
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
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  company_id IN (SELECT empresa_id FROM public.usuarios_empresas WHERE usuario_id = auth.uid() AND is_active = true)
);

-- ============================================
-- 7. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.usuarios_empresas IS 'Tabela de relacionamento muitos-para-muitos entre usuários e empresas. Permite que um usuário tenha acesso a múltiplas empresas.';
COMMENT ON FUNCTION public.get_current_empresa_id() IS 'Obtém a empresa_id ativa do usuário. Prioriza o valor do JWT, com fallback para a primeira empresa ativa do usuário.';
COMMENT ON FUNCTION public.user_has_empresa_access(UUID) IS 'Verifica se o usuário autenticado tem acesso à empresa especificada.';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Execute este script completo no SQL Editor do Supabase
-- Após executar, atualize o frontend para usar empresa_id do JWT
-- ============================================

