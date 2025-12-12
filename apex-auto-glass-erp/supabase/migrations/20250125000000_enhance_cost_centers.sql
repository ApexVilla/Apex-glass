-- ============================================
-- MIGRAÇÃO: Melhorias no Sistema de Centro de Custo
-- ============================================

-- 1. Adicionar campo type na tabela cost_centers
ALTER TABLE public.cost_centers
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('receita', 'despesa', 'misto')) DEFAULT 'misto';

-- 2. Tornar cost_center_id obrigatório em accounts_payable
ALTER TABLE public.accounts_payable
ALTER COLUMN cost_center_id SET NOT NULL;

-- Adicionar constraint para garantir que não seja NULL
DO $$
BEGIN
  -- Se houver registros sem cost_center_id, criar um centro de custo padrão
  IF EXISTS (
    SELECT 1 FROM public.accounts_payable 
    WHERE cost_center_id IS NULL
  ) THEN
    -- Criar centro de custo padrão se não existir
    INSERT INTO public.cost_centers (id, company_id, name, description, type, is_active, created_at)
    SELECT 
      gen_random_uuid(),
      company_id,
      'Centro de Custo Padrão',
      'Centro de custo criado automaticamente para lançamentos sem centro definido',
      'misto',
      true,
      now()
    FROM public.accounts_payable
    WHERE cost_center_id IS NULL
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- Atualizar registros sem cost_center_id
    UPDATE public.accounts_payable ap
    SET cost_center_id = (
      SELECT id FROM public.cost_centers cc
      WHERE cc.company_id = ap.company_id
      AND cc.name = 'Centro de Custo Padrão'
      LIMIT 1
    )
    WHERE cost_center_id IS NULL;
  END IF;
END $$;

-- 3. Tornar cost_center_id obrigatório em accounts_receivable
ALTER TABLE public.accounts_receivable
ALTER COLUMN cost_center_id SET NOT NULL;

-- Adicionar constraint para garantir que não seja NULL
DO $$
BEGIN
  -- Se houver registros sem cost_center_id, criar um centro de custo padrão
  IF EXISTS (
    SELECT 1 FROM public.accounts_receivable 
    WHERE cost_center_id IS NULL
  ) THEN
    -- Criar centro de custo padrão se não existir
    INSERT INTO public.cost_centers (id, company_id, name, description, type, is_active, created_at)
    SELECT 
      gen_random_uuid(),
      company_id,
      'Centro de Custo Padrão',
      'Centro de custo criado automaticamente para lançamentos sem centro definido',
      'misto',
      true,
      now()
    FROM public.accounts_receivable
    WHERE cost_center_id IS NULL
    LIMIT 1
    ON CONFLICT DO NOTHING;
    
    -- Atualizar registros sem cost_center_id
    UPDATE public.accounts_receivable ar
    SET cost_center_id = (
      SELECT id FROM public.cost_centers cc
      WHERE cc.company_id = ar.company_id
      AND cc.name = 'Centro de Custo Padrão'
      LIMIT 1
    )
    WHERE cost_center_id IS NULL;
  END IF;
END $$;

-- 4. Adicionar campo cost_center_id na tabela sales (opcional)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- 5. Criar função para verificar se centro de custo pode ser excluído
CREATE OR REPLACE FUNCTION public.can_delete_cost_center(cost_center_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_receivables BOOLEAN;
  has_payables BOOLEAN;
  has_sales BOOLEAN;
  has_movements BOOLEAN;
BEGIN
  -- Verificar se há contas a receber vinculadas
  SELECT EXISTS(
    SELECT 1 FROM public.accounts_receivable 
    WHERE cost_center_id = cost_center_uuid
  ) INTO has_receivables;
  
  -- Verificar se há contas a pagar vinculadas
  SELECT EXISTS(
    SELECT 1 FROM public.accounts_payable 
    WHERE cost_center_id = cost_center_uuid
  ) INTO has_payables;
  
  -- Verificar se há vendas vinculadas
  SELECT EXISTS(
    SELECT 1 FROM public.sales 
    WHERE cost_center_id = cost_center_uuid
  ) INTO has_sales;
  
  -- Verificar se há movimentações vinculadas
  SELECT EXISTS(
    SELECT 1 FROM public.financial_movements 
    WHERE cost_center_id = cost_center_uuid
  ) INTO has_movements;
  
  -- Retornar false se houver qualquer vinculação
  RETURN NOT (has_receivables OR has_payables OR has_sales OR has_movements);
END;
$$;

-- 6. Criar trigger para impedir exclusão se houver lançamentos
CREATE OR REPLACE FUNCTION public.prevent_cost_center_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.can_delete_cost_center(OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir o centro de custo "%" pois existem lançamentos vinculados a ele. Inative o centro de custo ao invés de excluí-lo.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS check_cost_center_deletion ON public.cost_centers;

-- Criar trigger
CREATE TRIGGER check_cost_center_deletion
BEFORE DELETE ON public.cost_centers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_cost_center_deletion();

-- 7. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_cost_centers_type ON public.cost_centers(type);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_cost_center ON public.accounts_payable(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_cost_center ON public.accounts_receivable(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_sales_cost_center ON public.sales(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_financial_movements_cost_center ON public.financial_movements(cost_center_id);

-- 8. Criar view para relatórios de centro de custo
CREATE OR REPLACE VIEW public.cost_center_summary AS
SELECT 
  cc.id,
  cc.company_id,
  cc.name,
  cc.type,
  cc.is_active,
  COALESCE(SUM(CASE 
    WHEN ar.status IN ('pago_total', 'pago_parcial') 
    THEN ar.paid_value 
    ELSE 0 
  END), 0) as total_receitas,
  COALESCE(SUM(CASE 
    WHEN ap.status IN ('pago_total', 'pago_parcial') 
    THEN ap.paid_value 
    ELSE 0 
  END), 0) as total_despesas,
  COALESCE(SUM(CASE 
    WHEN ar.status IN ('pago_total', 'pago_parcial') 
    THEN ar.paid_value 
    ELSE 0 
  END), 0) - 
  COALESCE(SUM(CASE 
    WHEN ap.status IN ('pago_total', 'pago_parcial') 
    THEN ap.paid_value 
    ELSE 0 
  END), 0) as saldo
FROM public.cost_centers cc
LEFT JOIN public.accounts_receivable ar ON ar.cost_center_id = cc.id
LEFT JOIN public.accounts_payable ap ON ap.cost_center_id = cc.id
GROUP BY cc.id, cc.company_id, cc.name, cc.type, cc.is_active;

-- Comentários
COMMENT ON COLUMN public.cost_centers.type IS 'Tipo do centro de custo: receita, despesa ou misto';
COMMENT ON FUNCTION public.can_delete_cost_center IS 'Verifica se um centro de custo pode ser excluído (sem lançamentos vinculados)';
COMMENT ON VIEW public.cost_center_summary IS 'Resumo financeiro por centro de custo';

