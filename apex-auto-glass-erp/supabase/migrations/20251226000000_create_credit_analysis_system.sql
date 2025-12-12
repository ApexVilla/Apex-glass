-- ============================================
-- MIGRAÇÃO: Sistema de Análise de Crédito
-- ============================================

-- 1. Criar tabela credit_limits (gerenciamento de limite de crédito por cliente)
CREATE TABLE IF NOT EXISTS public.credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  limit_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  limit_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  limit_available NUMERIC(12,2) GENERATED ALWAYS AS (limit_total - limit_used) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

-- 2. Criar tabela credit_logs (log de análises e decisões de crédito)
CREATE TABLE IF NOT EXISTS public.credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  analyzed_by UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'deny', 'adjust')),
  reason TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Adicionar campo credit_status na tabela sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'pending' CHECK (credit_status IN ('pending', 'approved', 'denied'));

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_limits_customer ON public.credit_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_company ON public.credit_limits(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_sale ON public.credit_logs(sale_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_company ON public.credit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_credit_status ON public.sales(credit_status);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE public.credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para credit_limits
CREATE POLICY "Users can view credit limits in their company"
ON public.credit_limits FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can manage credit limits in their company"
ON public.credit_limits FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- 7. Políticas RLS para credit_logs
CREATE POLICY "Users can view credit logs in their company"
ON public.credit_logs FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert credit logs in their company"
ON public.credit_logs FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

-- 8. Função para calcular limite usado do cliente
CREATE OR REPLACE FUNCTION public.calculate_customer_credit_used(
  p_customer_id uuid,
  p_company_id uuid,
  p_exclude_sale_id uuid DEFAULT NULL
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_used NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_total_used
  FROM public.sales
  WHERE customer_id = p_customer_id
    AND company_id = p_company_id
    AND payment_status IN ('pending', 'overdue')
    AND (p_exclude_sale_id IS NULL OR id != p_exclude_sale_id);
  
  RETURN v_total_used;
END;
$$;

-- 9. Função para atualizar limite usado do cliente
CREATE OR REPLACE FUNCTION public.update_customer_credit_used(
  p_customer_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit_used NUMERIC(12,2);
  v_limit_total NUMERIC(12,2);
BEGIN
  -- Calcular limite usado
  v_limit_used := public.calculate_customer_credit_used(p_customer_id, p_company_id);
  
  -- Buscar limite total do cliente
  SELECT COALESCE(credit_limit, 0)
  INTO v_limit_total
  FROM public.customers
  WHERE id = p_customer_id;
  
  -- Inserir ou atualizar credit_limits
  INSERT INTO public.credit_limits (company_id, customer_id, limit_total, limit_used, updated_at)
  VALUES (p_company_id, p_customer_id, v_limit_total, v_limit_used, now())
  ON CONFLICT (company_id, customer_id)
  DO UPDATE SET
    limit_total = EXCLUDED.limit_total,
    limit_used = v_limit_used,
    updated_at = now();
END;
$$;

-- 10. Função para verificar se forma de pagamento exige análise de crédito
CREATE OR REPLACE FUNCTION public.requires_credit_analysis(
  p_payment_method text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_payment_method IS NULL THEN
    RETURN false;
  END IF;
  
  -- Métodos que exigem análise de crédito
  RETURN LOWER(TRIM(p_payment_method)) IN (
    'boleto',
    'cartão a prazo',
    'cartao a prazo',
    'cartão a prazo parcelado',
    'credito interno',
    'crédito interno',
    'duplicata',
    'duplicatas',
    'cheque',
    'cheques',
    'prazo',
    'parcelado',
    'parcelamento'
  ) OR LOWER(TRIM(p_payment_method)) LIKE '%prazo%'
     OR LOWER(TRIM(p_payment_method)) LIKE '%parcelado%'
     OR LOWER(TRIM(p_payment_method)) LIKE '%boleto%'
     OR LOWER(TRIM(p_payment_method)) LIKE '%duplicata%';
END;
$$;

-- 11. Função para aplicar status C automaticamente
CREATE OR REPLACE FUNCTION public.apply_credit_status_if_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se a forma de pagamento exige análise de crédito, aplicar status C
  IF public.requires_credit_analysis(NEW.payment_method) THEN
    -- Adicionar status C se ainda não tiver
    IF NOT ('C' = ANY(COALESCE(NEW.status_codes, '{}'))) THEN
      NEW.status_codes := array_append(COALESCE(NEW.status_codes, '{}'), 'C');
      NEW.credit_status := 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 12. Trigger para aplicar status C automaticamente ao criar/atualizar venda
DROP TRIGGER IF EXISTS trigger_apply_credit_status ON public.sales;
CREATE TRIGGER trigger_apply_credit_status
  BEFORE INSERT OR UPDATE OF payment_method ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_credit_status_if_needed();

-- 13. Função para aprovar crédito
CREATE OR REPLACE FUNCTION public.approve_credit(
  p_sale_id uuid,
  p_analyzed_by uuid,
  p_reason text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_customer_id uuid;
  v_sale_total NUMERIC(12,2);
BEGIN
  -- Buscar dados da venda
  SELECT company_id, customer_id, total
  INTO v_company_id, v_customer_id, v_sale_total
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;
  
  -- Remover status C
  PERFORM public.remove_sale_status(p_sale_id, 'C');
  
  -- Atualizar credit_status
  UPDATE public.sales
  SET credit_status = 'approved'
  WHERE id = p_sale_id;
  
  -- Atualizar limite usado do cliente
  IF v_customer_id IS NOT NULL THEN
    PERFORM public.update_customer_credit_used(v_customer_id, v_company_id);
  END IF;
  
  -- Registrar no log
  INSERT INTO public.credit_logs (
    company_id,
    sale_id,
    analyzed_by,
    action,
    reason,
    details
  ) VALUES (
    v_company_id,
    p_sale_id,
    p_analyzed_by,
    'approve',
    p_reason,
    p_details
  );
END;
$$;

-- 14. Função para negar crédito
CREATE OR REPLACE FUNCTION public.deny_credit(
  p_sale_id uuid,
  p_analyzed_by uuid,
  p_reason text NOT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Buscar company_id da venda
  SELECT company_id
  INTO v_company_id
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;
  
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Motivo da negação é obrigatório';
  END IF;
  
  -- Manter status C e atualizar credit_status
  UPDATE public.sales
  SET credit_status = 'denied'
  WHERE id = p_sale_id;
  
  -- Registrar no log
  INSERT INTO public.credit_logs (
    company_id,
    sale_id,
    analyzed_by,
    action,
    reason,
    details
  ) VALUES (
    v_company_id,
    p_sale_id,
    p_analyzed_by,
    'deny',
    p_reason,
    p_details
  );
END;
$$;

-- 15. Função para solicitar ajuste
CREATE OR REPLACE FUNCTION public.request_credit_adjustment(
  p_sale_id uuid,
  p_analyzed_by uuid,
  p_reason text NOT NULL,
  p_adjustment_type text,
  p_adjustment_details jsonb DEFAULT '{}',
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_combined_details jsonb;
BEGIN
  -- Buscar company_id da venda
  SELECT company_id
  INTO v_company_id
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;
  
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Motivo do ajuste é obrigatório';
  END IF;
  
  -- Combinar detalhes
  v_combined_details := p_details || jsonb_build_object(
    'adjustment_type', p_adjustment_type,
    'adjustment_details', p_adjustment_details
  );
  
  -- Registrar no log
  INSERT INTO public.credit_logs (
    company_id,
    sale_id,
    analyzed_by,
    action,
    reason,
    details
  ) VALUES (
    v_company_id,
    p_sale_id,
    p_analyzed_by,
    'adjust',
    p_reason,
    v_combined_details
  );
END;
$$;

-- 16. Função para obter informações de crédito do cliente
CREATE OR REPLACE FUNCTION public.get_customer_credit_info(
  p_customer_id uuid,
  p_company_id uuid
)
RETURNS TABLE (
  limit_total NUMERIC(12,2),
  limit_used NUMERIC(12,2),
  limit_available NUMERIC(12,2),
  total_open NUMERIC(12,2),
  total_overdue NUMERIC(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(cl.limit_total, 0)::NUMERIC(12,2) as limit_total,
    COALESCE(cl.limit_used, 0)::NUMERIC(12,2) as limit_used,
    COALESCE(cl.limit_available, 0)::NUMERIC(12,2) as limit_available,
    COALESCE(SUM(CASE WHEN s.payment_status = 'pending' THEN s.total ELSE 0 END), 0)::NUMERIC(12,2) as total_open,
    COALESCE(SUM(CASE WHEN s.payment_status = 'overdue' THEN s.total ELSE 0 END), 0)::NUMERIC(12,2) as total_overdue
  FROM public.customers c
  LEFT JOIN public.credit_limits cl ON cl.customer_id = c.id AND cl.company_id = p_company_id
  LEFT JOIN public.sales s ON s.customer_id = c.id AND s.company_id = p_company_id
  WHERE c.id = p_customer_id
  GROUP BY cl.limit_total, cl.limit_used, cl.limit_available;
END;
$$;

-- 17. Trigger para atualizar limite usado quando venda é criada/atualizada
CREATE OR REPLACE FUNCTION public.update_credit_limit_on_sale_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualizar limite usado do cliente quando venda é criada ou atualizada
  IF NEW.customer_id IS NOT NULL THEN
    PERFORM public.update_customer_credit_used(NEW.customer_id, NEW.company_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_credit_limit_on_sale ON public.sales;
CREATE TRIGGER trigger_update_credit_limit_on_sale
  AFTER INSERT OR UPDATE OF total, payment_status, customer_id ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credit_limit_on_sale_change();

-- 18. Atualizar função can_invoice_sale para considerar credit_status
CREATE OR REPLACE FUNCTION public.can_invoice_sale(
  p_sale_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_codes text[];
  v_status_venda text;
  v_credit_status text;
BEGIN
  -- Buscar status da venda
  SELECT COALESCE(status_codes, '{}'), COALESCE(status_venda, 'normal'), COALESCE(credit_status, 'pending')
  INTO v_status_codes, v_status_venda, v_credit_status
  FROM public.sales
  WHERE id = p_sale_id;

  -- Verificar se há pendências de separação ou conferência pelo status_venda
  IF v_status_venda IN ('aguardando_separacao', 'em_separacao', 'separado', 'conferencia_pendente') THEN
    RETURN false;
  END IF;

  -- Se credit_status for 'pending' ou 'denied', não pode faturar
  IF v_credit_status IN ('pending', 'denied') THEN
    RETURN false;
  END IF;

  -- Retornar true apenas se não houver status (array vazio)
  RETURN array_length(v_status_codes, 1) IS NULL;
END;
$$;

-- 19. Comentários para documentação
COMMENT ON TABLE public.credit_limits IS 'Gerencia limites de crédito por cliente';
COMMENT ON TABLE public.credit_logs IS 'Log de análises e decisões de crédito';
COMMENT ON COLUMN public.sales.credit_status IS 'Status de análise de crédito: pending (pendente), approved (aprovado), denied (negado)';
COMMENT ON FUNCTION public.approve_credit IS 'Aprova crédito de uma venda, remove status C e atualiza limite usado';
COMMENT ON FUNCTION public.deny_credit IS 'Nega crédito de uma venda, mantém status C';
COMMENT ON FUNCTION public.request_credit_adjustment IS 'Registra solicitação de ajuste de crédito';
COMMENT ON FUNCTION public.get_customer_credit_info IS 'Retorna informações completas de crédito do cliente';

