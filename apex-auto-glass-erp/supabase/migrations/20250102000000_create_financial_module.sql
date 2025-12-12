-- ============================================
-- MÓDULO FINANCEIRO COMPLETO
-- ============================================

-- 1. ENUMS para o módulo financeiro
CREATE TYPE public.financial_nature_type AS ENUM ('entrada', 'saida', 'ambos');
CREATE TYPE public.account_type AS ENUM ('caixa', 'banco', 'carteira');
CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'ted', 'cheque', 'cartao_corporativo');
CREATE TYPE public.receivable_status AS ENUM ('em_aberto', 'pago_parcial', 'pago_total', 'cancelado');
CREATE TYPE public.payable_status AS ENUM ('em_aberto', 'pago_parcial', 'pago_total', 'cancelado');
CREATE TYPE public.reconciliation_status AS ENUM ('pendente', 'conciliado', 'divergente');

-- 2. NATUREZAS FINANCEIRAS
CREATE TABLE public.financial_natures (
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

-- 3. CENTROS DE CUSTO
CREATE TABLE public.cost_centers (
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
CREATE TABLE public.financial_accounts (
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
CREATE TABLE public.accounts_receivable (
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
CREATE TABLE public.accounts_payable (
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
CREATE TABLE public.financial_movements (
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

-- 8. TRANSFERÊNCIAS ENTRE CONTAS
CREATE TABLE public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC(15,2) NOT NULL,
  description TEXT,
  from_movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
  to_movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_different_accounts CHECK (from_account_id != to_account_id)
);

-- 9. CONCILIAÇÃO BANCÁRIA
CREATE TABLE public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL,
  system_balance NUMERIC(15,2) NOT NULL,
  difference NUMERIC(15,2) NOT NULL,
  status reconciliation_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  ofx_file_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. ITENS DE CONCILIAÇÃO
CREATE TABLE public.reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_value NUMERIC(15,2) NOT NULL,
  statement_description TEXT,
  movement_id UUID REFERENCES public.financial_movements(id) ON DELETE SET NULL,
  is_matched BOOLEAN DEFAULT false,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. PARCELAS (Para múltiplos lançamentos)
CREATE TABLE public.financial_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  parent_payable_id UUID REFERENCES public.accounts_payable(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  paid_value NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'pago_parcial', 'pago_total', 'cancelado')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_parent CHECK (
    (parent_receivable_id IS NOT NULL AND parent_payable_id IS NULL) OR
    (parent_receivable_id IS NULL AND parent_payable_id IS NOT NULL)
  )
);

-- 12. ANEXOS DE COMPROVANTES
CREATE TABLE public.financial_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  payable_id UUID REFERENCES public.accounts_payable(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. LOGS DE MOVIMENTAÇÕES FINANCEIRAS
CREATE TABLE public.financial_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'receivable', 'payable', 'movement', 'transfer', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'reversed', 'paid', etc.
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. FECHAMENTO DE CAIXA
CREATE TABLE public.cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  closure_date DATE NOT NULL,
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_entries NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_exits NUMERIC(15,2) NOT NULL DEFAULT 0,
  expected_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference NUMERIC(15,2) NOT NULL DEFAULT 0,
  observations TEXT,
  closed_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_daily_closure UNIQUE (account_id, closure_date)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_receivable_company ON public.accounts_receivable(company_id);
CREATE INDEX idx_receivable_customer ON public.accounts_receivable(customer_id);
CREATE INDEX idx_receivable_status ON public.accounts_receivable(status);
CREATE INDEX idx_receivable_date ON public.accounts_receivable(expected_receipt_date);
CREATE INDEX idx_receivable_nature ON public.accounts_receivable(nature_id);

CREATE INDEX idx_payable_company ON public.accounts_payable(company_id);
CREATE INDEX idx_payable_supplier ON public.accounts_payable(supplier_id);
CREATE INDEX idx_payable_status ON public.accounts_payable(status);
CREATE INDEX idx_payable_due_date ON public.accounts_payable(due_date);
CREATE INDEX idx_payable_nature ON public.accounts_payable(nature_id);

CREATE INDEX idx_movements_account ON public.financial_movements(account_id);
CREATE INDEX idx_movements_date ON public.financial_movements(movement_date);
CREATE INDEX idx_movements_type ON public.financial_movements(movement_type);
CREATE INDEX idx_movements_receivable ON public.financial_movements(receivable_id);
CREATE INDEX idx_movements_payable ON public.financial_movements(payable_id);

CREATE INDEX idx_natures_company ON public.financial_natures(company_id);
CREATE INDEX idx_cost_centers_company ON public.cost_centers(company_id);
CREATE INDEX idx_accounts_company ON public.financial_accounts(company_id);
CREATE INDEX idx_cash_closures_account ON public.cash_closures(account_id);
CREATE INDEX idx_cash_closures_date ON public.cash_closures(closure_date);
CREATE INDEX idx_cash_closures_account ON public.cash_closures(account_id);
CREATE INDEX idx_cash_closures_date ON public.cash_closures(closure_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.financial_natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando a função get_user_company_id()
CREATE POLICY "Users can manage financial natures in their company"
  ON public.financial_natures FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage cost centers in their company"
  ON public.cost_centers FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage financial accounts in their company"
  ON public.financial_accounts FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage receivables in their company"
  ON public.accounts_receivable FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage payables in their company"
  ON public.accounts_payable FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage movements in their company"
  ON public.financial_movements FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage transfers in their company"
  ON public.account_transfers FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage reconciliations in their company"
  ON public.bank_reconciliations FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage reconciliation items in their company"
  ON public.reconciliation_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_reconciliations br
      WHERE br.id = reconciliation_id
      AND br.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can manage installments in their company"
  ON public.financial_installments FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage attachments in their company"
  ON public.financial_attachments FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can view logs in their company"
  ON public.financial_logs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage cash closures in their company"
  ON public.cash_closures FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage cash closures in their company"
  ON public.cash_closures FOR ALL
  USING (company_id = get_user_company_id());

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financial_natures_updated_at
  BEFORE UPDATE ON public.financial_natures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_movements_updated_at
  BEFORE UPDATE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_installments_updated_at
  BEFORE UPDATE ON public.financial_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_reconciliations_updated_at
  BEFORE UPDATE ON public.bank_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar saldo da conta automaticamente
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.movement_type = 'entrada' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance + NEW.value
      WHERE id = NEW.account_id;
    ELSIF NEW.movement_type = 'saida' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance - NEW.value
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.movement_type = 'entrada' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance - OLD.value
      WHERE id = OLD.account_id;
    ELSIF OLD.movement_type = 'saida' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance + OLD.value
      WHERE id = OLD.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverter valor antigo
    IF OLD.movement_type = 'entrada' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance - OLD.value
      WHERE id = OLD.account_id;
    ELSIF OLD.movement_type = 'saida' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance + OLD.value
      WHERE id = OLD.account_id;
    END IF;
    -- Aplicar valor novo
    IF NEW.movement_type = 'entrada' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance + NEW.value
      WHERE id = NEW.account_id;
    ELSIF NEW.movement_type = 'saida' THEN
      UPDATE public.financial_accounts
      SET current_balance = current_balance - NEW.value
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Função para criar log de movimentações
CREATE OR REPLACE FUNCTION public.log_financial_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.financial_logs (company_id, entity_type, entity_id, action, user_id, details)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    COALESCE(NEW.created_by, OLD.created_by, auth.uid()),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_receivable_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.log_financial_action();

CREATE TRIGGER log_payable_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION public.log_financial_action();

CREATE TRIGGER log_movement_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_financial_action();

-- Função para atualizar status de contas a receber baseado no valor pago
CREATE OR REPLACE FUNCTION public.update_receivable_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_value = 0 THEN
    NEW.status = 'em_aberto';
  ELSIF NEW.paid_value < NEW.net_value THEN
    NEW.status = 'pago_parcial';
  ELSIF NEW.paid_value >= NEW.net_value THEN
    NEW.status = 'pago_total';
    NEW.paid_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_receivable_status
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  WHEN (OLD.paid_value IS DISTINCT FROM NEW.paid_value)
  EXECUTE FUNCTION public.update_receivable_status();

-- Função para atualizar status de contas a pagar baseado no valor pago
CREATE OR REPLACE FUNCTION public.update_payable_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_value = 0 THEN
    NEW.status = 'em_aberto';
  ELSIF NEW.paid_value < NEW.final_value THEN
    NEW.status = 'pago_parcial';
  ELSIF NEW.paid_value >= NEW.final_value THEN
    NEW.status = 'pago_total';
    NEW.paid_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payable_status
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW
  WHEN (OLD.paid_value IS DISTINCT FROM NEW.paid_value)
  EXECUTE FUNCTION public.update_payable_status();

