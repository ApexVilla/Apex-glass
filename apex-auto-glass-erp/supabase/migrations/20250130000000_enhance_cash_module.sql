-- ============================================
-- MIGRAÇÃO: MELHORIAS NO MÓDULO DE CAIXA
-- Adiciona campos para conciliação, alertas, categorias e integração automática
-- ============================================

-- 1. Adicionar campos à tabela financial_movements
ALTER TABLE public.financial_movements
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reference_type TEXT CHECK (reference_type IN ('sale', 'receivable', 'payable', 'expense', 'manual', 'transfer')),
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS observation TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_balance_alert_sent BOOLEAN DEFAULT false;

-- 2. Criar tabela para alertas de saldo baixo
CREATE TABLE IF NOT EXISTS public.cash_balance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  threshold_amount NUMERIC(15,2) NOT NULL,
  current_balance NUMERIC(15,2) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_balance', 'negative_balance', 'high_balance')),
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMPTZ,
  notified_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar tabela para configurações de alertas por conta
CREATE TABLE IF NOT EXISTS public.account_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  low_balance_threshold NUMERIC(15,2),
  enable_low_balance_alert BOOLEAN DEFAULT true,
  enable_negative_balance_alert BOOLEAN DEFAULT true,
  notification_emails TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- 4. Criar tabela para logs de auditoria de movimentações
CREATE TABLE IF NOT EXISTS public.cash_movement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES public.financial_movements(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'reversed', 'reconciled')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- 5. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_movements_reconciled ON public.financial_movements(is_reconciled) WHERE is_reconciled = false;
CREATE INDEX IF NOT EXISTS idx_movements_category ON public.financial_movements(category);
CREATE INDEX IF NOT EXISTS idx_movements_reference ON public.financial_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_payment_method ON public.financial_movements(payment_method);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_account ON public.cash_balance_alerts(account_id);
CREATE INDEX IF NOT EXISTS idx_balance_alerts_active ON public.cash_balance_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_movement ON public.cash_movement_audit_logs(movement_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON public.cash_movement_audit_logs(changed_at DESC);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.cash_balance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movement_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas RLS
CREATE POLICY "Users can manage balance alerts in their company"
  ON public.cash_balance_alerts FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage alert settings in their company"
  ON public.account_alert_settings FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can view audit logs in their company"
  ON public.cash_movement_audit_logs FOR SELECT
  USING (company_id = get_user_company_id());

-- 8. Criar função para atualizar saldo da conta automaticamente
CREATE OR REPLACE FUNCTION update_account_balance_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_reversed = false THEN
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
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverter saldo antigo
    IF OLD.is_reversed = false THEN
      IF OLD.movement_type = 'entrada' THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance - OLD.value
        WHERE id = OLD.account_id;
      ELSIF OLD.movement_type = 'saida' THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance + OLD.value
        WHERE id = OLD.account_id;
      END IF;
    END IF;
    -- Aplicar novo saldo
    IF NEW.is_reversed = false THEN
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
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_reversed = false THEN
      IF OLD.movement_type = 'entrada' THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance - OLD.value
        WHERE id = OLD.account_id;
      ELSIF OLD.movement_type = 'saida' THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance + OLD.value
        WHERE id = OLD.account_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger para atualizar saldo automaticamente
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.financial_movements;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_movement();

-- 10. Criar função para verificar saldo baixo e criar alertas
CREATE OR REPLACE FUNCTION check_low_balance_alerts()
RETURNS void AS $$
DECLARE
  account_record RECORD;
  alert_setting RECORD;
  current_balance NUMERIC;
BEGIN
  FOR account_record IN 
    SELECT id, company_id, current_balance, name 
    FROM public.financial_accounts 
    WHERE is_active = true
  LOOP
    -- Buscar configuração de alerta
    SELECT * INTO alert_setting
    FROM public.account_alert_settings
    WHERE account_id = account_record.id;
    
    -- Se não houver configuração, usar padrão (R$ 1000)
    IF alert_setting IS NULL OR alert_setting.low_balance_threshold IS NULL THEN
      IF account_record.current_balance < 1000 THEN
        -- Verificar se já existe alerta ativo
        IF NOT EXISTS (
          SELECT 1 FROM public.cash_balance_alerts
          WHERE account_id = account_record.id
          AND alert_type = 'low_balance'
          AND is_active = true
        ) THEN
          INSERT INTO public.cash_balance_alerts (
            company_id, account_id, threshold_amount, current_balance, alert_type
          ) VALUES (
            account_record.company_id,
            account_record.id,
            1000,
            account_record.current_balance,
            'low_balance'
          );
        END IF;
      END IF;
    ELSE
      -- Usar configuração personalizada
      IF alert_setting.enable_low_balance_alert = true 
         AND account_record.current_balance < alert_setting.low_balance_threshold THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.cash_balance_alerts
          WHERE account_id = account_record.id
          AND alert_type = 'low_balance'
          AND is_active = true
        ) THEN
          INSERT INTO public.cash_balance_alerts (
            company_id, account_id, threshold_amount, current_balance, alert_type
          ) VALUES (
            account_record.company_id,
            account_record.id,
            alert_setting.low_balance_threshold,
            account_record.current_balance,
            'low_balance'
          );
        END IF;
      END IF;
      
      -- Verificar saldo negativo
      IF alert_setting.enable_negative_balance_alert = true 
         AND account_record.current_balance < 0 THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.cash_balance_alerts
          WHERE account_id = account_record.id
          AND alert_type = 'negative_balance'
          AND is_active = true
        ) THEN
          INSERT INTO public.cash_balance_alerts (
            company_id, account_id, threshold_amount, current_balance, alert_type
          ) VALUES (
            account_record.company_id,
            account_record.id,
            0,
            account_record.current_balance,
            'negative_balance'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 11. Criar função para registrar logs de auditoria
CREATE OR REPLACE FUNCTION log_cash_movement_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cash_movement_audit_logs (
      company_id, movement_id, action, new_values, changed_by
    ) VALUES (
      NEW.company_id, NEW.id, 'created', to_jsonb(NEW), NEW.created_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cash_movement_audit_logs (
      company_id, movement_id, action, old_values, new_values, changed_by
    ) VALUES (
      NEW.company_id, NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.cash_movement_audit_logs (
      company_id, movement_id, action, old_values, changed_by
    ) VALUES (
      OLD.company_id, OLD.id, 'deleted', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 12. Criar trigger para logs de auditoria
DROP TRIGGER IF EXISTS trigger_cash_movement_audit ON public.financial_movements;
CREATE TRIGGER trigger_cash_movement_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_cash_movement_audit();

-- 13. Criar função para obter saldo por período
CREATE OR REPLACE FUNCTION get_account_balance_by_period(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  initial_balance NUMERIC,
  total_entries NUMERIC,
  total_exits NUMERIC,
  final_balance NUMERIC
) AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_account_initial NUMERIC;
BEGIN
  -- Saldo inicial da conta
  SELECT initial_balance INTO v_account_initial
  FROM public.financial_accounts
  WHERE id = p_account_id;
  
  -- Saldo inicial do período (saldo da conta + movimentações antes do período)
  SELECT COALESCE(SUM(
    CASE 
      WHEN movement_type = 'entrada' AND is_reversed = false THEN value
      WHEN movement_type = 'saida' AND is_reversed = false THEN -value
      ELSE 0
    END
  ), 0) + v_account_initial INTO v_initial_balance
  FROM public.financial_movements
  WHERE account_id = p_account_id
  AND movement_date < p_start_date;
  
  -- Retornar resultados
  RETURN QUERY
  SELECT 
    v_initial_balance as initial_balance,
    COALESCE(SUM(CASE WHEN movement_type = 'entrada' AND is_reversed = false THEN value ELSE 0 END), 0) as total_entries,
    COALESCE(SUM(CASE WHEN movement_type = 'saida' AND is_reversed = false THEN value ELSE 0 END), 0) as total_exits,
    v_initial_balance + 
    COALESCE(SUM(CASE WHEN movement_type = 'entrada' AND is_reversed = false THEN value ELSE -value END), 0) as final_balance
  FROM public.financial_movements
  WHERE account_id = p_account_id
  AND movement_date >= p_start_date
  AND movement_date <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 14. Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_cash_balance_alerts_updated_at ON public.cash_balance_alerts;
CREATE TRIGGER update_cash_balance_alerts_updated_at
  BEFORE UPDATE ON public.cash_balance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_alert_settings_updated_at ON public.account_alert_settings;
CREATE TRIGGER update_account_alert_settings_updated_at
  BEFORE UPDATE ON public.account_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Comentários nas tabelas
COMMENT ON TABLE public.cash_balance_alerts IS 'Alertas de saldo baixo ou negativo nas contas';
COMMENT ON TABLE public.account_alert_settings IS 'Configurações de alertas por conta financeira';
COMMENT ON TABLE public.cash_movement_audit_logs IS 'Logs de auditoria para todas as alterações em movimentações de caixa';

COMMENT ON COLUMN public.financial_movements.payment_method IS 'Forma de pagamento: pix, dinheiro, cartao_credito, etc';
COMMENT ON COLUMN public.financial_movements.category IS 'Categoria da movimentação: venda, compra, despesa, etc';
COMMENT ON COLUMN public.financial_movements.is_reconciled IS 'Indica se a movimentação foi conciliada';
COMMENT ON COLUMN public.financial_movements.reference_type IS 'Tipo de referência: sale, receivable, payable, expense, manual, transfer';
COMMENT ON COLUMN public.financial_movements.is_automatic IS 'Indica se a movimentação foi gerada automaticamente';

-- Verificar se a migração foi aplicada
SELECT '✅ Migração de melhorias no módulo de Caixa aplicada com sucesso!' as status;

