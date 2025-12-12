-- ============================================
-- SCRIPT COMPLETO DE SETUP DO BANCO DE DADOS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Verificar se a função get_user_company_id existe
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
  user_email TEXT;
BEGIN
  -- Obter email do usuário autenticado
  user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  
  -- Verificar se é usuário master
  IF user_email IN ('villarroelsamir85@gmail.com', 'samir@apexglass.com') THEN
    -- Para usuários master, tentar obter company_id do localStorage (via função auxiliar)
    -- Por padrão, retornar null para permitir acesso a todas as empresas
    RETURN NULL;
  END IF;
  
  -- Para usuários normais, obter company_id do perfil
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MÓDULO FINANCEIRO COMPLETO
-- ============================================

-- 1. ENUMS para o módulo financeiro (criar apenas se não existirem)
DO $$ BEGIN
    CREATE TYPE public.financial_nature_type AS ENUM ('entrada', 'saida', 'ambos');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.account_type AS ENUM ('caixa', 'banco', 'carteira');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'ted', 'cheque', 'cartao_corporativo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.receivable_status AS ENUM ('em_aberto', 'pago_parcial', 'pago_total', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payable_status AS ENUM ('em_aberto', 'pago_parcial', 'pago_total', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.reconciliation_status AS ENUM ('pendente', 'conciliado', 'divergente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. NATUREZAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.financial_natures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type financial_nature_type NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  appears_in_receivables BOOLEAN DEFAULT false,
  appears_in_payables BOOLEAN DEFAULT false,
  code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_nature_code UNIQUE (company_id, code)
);

-- Adicionar novos campos se não existirem
DO $$ 
BEGIN
    ALTER TABLE public.financial_natures
    ADD COLUMN IF NOT EXISTS usada_em_vendas BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS usada_em_compras BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS usada_em_despesas BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS usada_no_caixa BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS gerar_automatico BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS permitir_edicao BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS descricao TEXT;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 3. CENTROS DE CUSTO
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_cost_center_code UNIQUE (company_id, code)
);

-- 4. CONTAS BANCÁRIAS / CAIXA
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  initial_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  allow_reconciliation BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. CONTAS A RECEBER
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_number SERIAL,
  launch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_receipt_date DATE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  observation TEXT,
  nature_id UUID REFERENCES public.financial_natures(id) ON DELETE SET NULL,
  nature_category TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  payment_method payment_method,
  entry_value NUMERIC(15,2) NOT NULL,
  discount NUMERIC(15,2) DEFAULT 0,
  net_value NUMERIC(15,2) NOT NULL,
  paid_value NUMERIC(15,2) DEFAULT 0,
  status receivable_status NOT NULL DEFAULT 'em_aberto',
  payment_proof_url TEXT,
  invoice_number TEXT,
  seller_id UUID REFERENCES auth.users(id),
  destination_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT check_expected_date CHECK (expected_receipt_date <= (CURRENT_DATE + INTERVAL '2 years')),
  CONSTRAINT check_net_value CHECK (net_value = entry_value - discount),
  CONSTRAINT check_paid_value CHECK (paid_value <= net_value)
);

-- 6. CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_number SERIAL,
  launch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  nature_id UUID REFERENCES public.financial_natures(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  origin_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  payment_method payment_method,
  total_value NUMERIC(15,2) NOT NULL,
  interest_fine NUMERIC(15,2) DEFAULT 0,
  final_value NUMERIC(15,2) NOT NULL,
  paid_value NUMERIC(15,2) DEFAULT 0,
  status payable_status NOT NULL DEFAULT 'em_aberto',
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT check_due_date CHECK (due_date >= launch_date),
  CONSTRAINT check_final_value CHECK (final_value = total_value + interest_fine),
  CONSTRAINT check_paid_value_payable CHECK (paid_value <= final_value)
);

-- 7. MOVIMENTAÇÕES FINANCEIRAS (Extrato)
CREATE TABLE IF NOT EXISTS public.financial_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'transferencia')),
  description TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
  payable_id UUID REFERENCES public.accounts_payable(id) ON DELETE SET NULL,
  nature_id UUID REFERENCES public.financial_natures(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES auth.users(id),
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reverse_reason TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. TABELA SUPPLIERS (se não existir)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid not null default gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo_pessoa text check (tipo_pessoa in ('PF', 'PJ')),
  nome_razao text not null,
  nome_fantasia text,
  cpf_cnpj text,
  ie text,
  im text,
  cnae text,
  regime_tributario text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  pais text default 'Brasil',
  telefone1 text,
  telefone2 text,
  whatsapp text,
  email_principal text,
  email_financeiro text,
  site text,
  contato_principal text,
  vendedor_fornecedor text,
  observacoes text,
  prazo_entrega text,
  linha_produtos text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  pix text,
  limite_credito numeric,
  condicao_pagamento text,
  metodo_pagamento text,
  retencao_impostos boolean default false,
  impostos_retidos jsonb,
  regime_icms text,
  indicador_contribuinte text,
  cod_municipio text,
  aliquota_iss numeric,
  lista_servicos text,
  retem_iss boolean default false,
  ativo boolean default true,
  categoria text,
  prioridade text,
  is_transportadora boolean default false,
  emite_nfe boolean default false,
  emite_nfse boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_receivable_company ON public.accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_receivable_customer ON public.accounts_receivable(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivable_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_receivable_date ON public.accounts_receivable(expected_receipt_date);
CREATE INDEX IF NOT EXISTS idx_receivable_nature ON public.accounts_receivable(nature_id);

CREATE INDEX IF NOT EXISTS idx_payable_company ON public.accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_payable_supplier ON public.accounts_payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payable_status ON public.accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_payable_due_date ON public.accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_payable_nature ON public.accounts_payable(nature_id);

CREATE INDEX IF NOT EXISTS idx_movements_account ON public.financial_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON public.financial_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_movements_type ON public.financial_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_receivable ON public.financial_movements(receivable_id);
CREATE INDEX IF NOT EXISTS idx_movements_payable ON public.financial_movements(payable_id);

CREATE INDEX IF NOT EXISTS idx_natures_company ON public.financial_natures(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON public.cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON public.financial_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.financial_natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can manage financial natures in their company" ON public.financial_natures;
DROP POLICY IF EXISTS "Users can manage cost centers in their company" ON public.cost_centers;
DROP POLICY IF EXISTS "Users can manage financial accounts in their company" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can manage receivables in their company" ON public.accounts_receivable;
DROP POLICY IF EXISTS "Users can manage payables in their company" ON public.accounts_payable;
DROP POLICY IF EXISTS "Users can manage movements in their company" ON public.financial_movements;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers in their company" ON public.suppliers;

-- Políticas RLS usando a função get_user_company_id()
CREATE POLICY "Users can manage financial natures in their company"
  ON public.financial_natures FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can manage cost centers in their company"
  ON public.cost_centers FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can manage financial accounts in their company"
  ON public.financial_accounts FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can manage receivables in their company"
  ON public.accounts_receivable FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can manage payables in their company"
  ON public.accounts_payable FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can manage movements in their company"
  ON public.financial_movements FOR ALL
  USING (company_id = get_user_company_id() OR get_user_company_id() IS NULL);

CREATE POLICY "Users can view suppliers in their company"
  ON public.suppliers FOR SELECT
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    get_user_company_id() IS NULL
  );

CREATE POLICY "Users can insert suppliers in their company"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    get_user_company_id() IS NULL
  );

CREATE POLICY "Users can update suppliers in their company"
  ON public.suppliers FOR UPDATE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    get_user_company_id() IS NULL
  );

CREATE POLICY "Users can delete suppliers in their company"
  ON public.suppliers FOR DELETE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    get_user_company_id() IS NULL
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_financial_natures_updated_at ON public.financial_natures;
CREATE TRIGGER update_financial_natures_updated_at
  BEFORE UPDATE ON public.financial_natures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cost_centers_updated_at ON public.cost_centers;
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_accounts_updated_at ON public.financial_accounts;
CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_receivable_updated_at ON public.accounts_receivable;
CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_payable_updated_at ON public.accounts_payable;
CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_movements_updated_at ON public.financial_movements;
CREATE TRIGGER update_financial_movements_updated_at
  BEFORE UPDATE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
DROP TRIGGER IF EXISTS handle_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INSERIR NATUREZAS PADRÃO
-- ============================================
-- Função para inserir naturezas padrão
CREATE OR REPLACE FUNCTION public.insert_default_financial_natures(p_company_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.financial_natures (
    company_id, type, name, code, category, subcategory,
    usada_em_vendas, usada_em_compras, usada_em_despesas, usada_no_caixa,
    gerar_automatico, permitir_edicao, is_active,
    appears_in_receivables, appears_in_payables, descricao
  ) VALUES
  -- Entradas
  (p_company_id, 'entrada', 'Venda de Produtos', '1.01', 'Venda', 'Produtos', true, false, false, true, true, true, true, true, false, 'Natureza para registro de vendas de produtos'),
  (p_company_id, 'entrada', 'Venda de Serviços', '1.02', 'Venda', 'Serviços', true, false, false, true, true, true, true, true, false, 'Natureza para registro de vendas de serviços'),
  (p_company_id, 'entrada', 'Devolução de Compra', '1.03', 'Devolução', 'Compra', false, true, false, true, true, true, true, false, true, 'Natureza para registro de devoluções de compras'),
  (p_company_id, 'entrada', 'Recebimento Cliente', '1.04', 'Recebimento', 'Cliente', true, false, false, true, true, true, true, true, false, 'Natureza para registro de recebimentos de clientes'),
  (p_company_id, 'entrada', 'Juros Recebidos', '1.05', 'Financeiro', 'Juros', false, false, false, true, true, true, true, true, false, 'Natureza para registro de juros recebidos'),
  (p_company_id, 'entrada', 'Transferência Entrada', '1.06', 'Transferência', 'Entrada', false, false, false, true, false, true, true, false, false, 'Natureza para registro de transferências entre contas (entrada)'),
  (p_company_id, 'entrada', 'Ajuste Positivo', '1.07', 'Ajuste', 'Positivo', false, false, false, true, false, true, true, false, false, 'Natureza para registro de ajustes positivos no caixa'),
  -- Saídas
  (p_company_id, 'saida', 'Compra de Mercadoria', '2.01', 'Compra', 'Mercadoria', false, true, false, true, true, true, true, false, true, 'Natureza para registro de compras de mercadorias'),
  (p_company_id, 'saida', 'Despesas Fixas', '2.02', 'Despesa', 'Fixa', false, false, true, true, true, true, true, false, true, 'Natureza para registro de despesas fixas'),
  (p_company_id, 'saida', 'Despesas Variáveis', '2.03', 'Despesa', 'Variável', false, false, true, true, true, true, true, false, true, 'Natureza para registro de despesas variáveis'),
  (p_company_id, 'saida', 'Pagamento Fornecedor', '2.04', 'Pagamento', 'Fornecedor', false, true, false, true, true, true, true, false, true, 'Natureza para registro de pagamentos a fornecedores'),
  (p_company_id, 'saida', 'Pagamento Funcionário', '2.05', 'Pagamento', 'Funcionário', false, false, true, true, true, true, true, false, true, 'Natureza para registro de pagamentos a funcionários'),
  (p_company_id, 'saida', 'Impostos', '2.06', 'Imposto', 'Tributação', false, false, true, true, true, true, true, false, true, 'Natureza para registro de pagamentos de impostos'),
  (p_company_id, 'saida', 'Transferência Saída', '2.07', 'Transferência', 'Saída', false, false, false, true, false, true, true, false, false, 'Natureza para registro de transferências entre contas (saída)'),
  (p_company_id, 'saida', 'Ajuste Negativo', '2.08', 'Ajuste', 'Negativo', false, false, false, true, false, true, true, false, false, 'Natureza para registro de ajustes negativos no caixa'),
  (p_company_id, 'saida', 'Taxas bancárias', '2.09', 'Despesa', 'Bancária', false, false, true, true, true, true, true, false, true, 'Natureza para registro de taxas bancárias')
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Inserir naturezas padrão para empresas existentes que não possuem naturezas
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT id FROM public.companies 
    WHERE id NOT IN (
      SELECT DISTINCT company_id FROM public.financial_natures WHERE company_id IS NOT NULL
    )
  LOOP
    PERFORM public.insert_default_financial_natures(company_record.id);
  END LOOP;
END $$;

