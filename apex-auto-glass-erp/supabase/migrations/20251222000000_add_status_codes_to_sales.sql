-- ============================================
-- MIGRAÇÃO: Adicionar sistema de status de pendências nas vendas
-- Status: E (Estoque), C (Crédito), D (Desconto)
-- ============================================

-- 1. Adicionar coluna status_codes na tabela sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status_codes text[] DEFAULT '{}';

-- 2. Criar função para adicionar status
CREATE OR REPLACE FUNCTION public.add_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar código de status
  IF p_status_code NOT IN ('E', 'C', 'D') THEN
    RAISE EXCEPTION 'Código de status inválido. Use: E, C ou D';
  END IF;

  -- Adicionar status se ainda não existir
  UPDATE public.sales
  SET status_codes = array_append(
    COALESCE(status_codes, '{}'),
    p_status_code
  )
  WHERE id = p_sale_id
  AND NOT (p_status_code = ANY(COALESCE(status_codes, '{}')));
END;
$$;

-- 3. Criar função para remover status
CREATE OR REPLACE FUNCTION public.remove_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remover status do array
  UPDATE public.sales
  SET status_codes = array_remove(
    COALESCE(status_codes, '{}'),
    p_status_code
  )
  WHERE id = p_sale_id;
END;
$$;

-- 4. Criar função para verificar se pode faturar
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
BEGIN
  -- Buscar status da venda
  SELECT COALESCE(status_codes, '{}'), COALESCE(status_venda, 'normal')
  INTO v_status_codes, v_status_venda
  FROM public.sales
  WHERE id = p_sale_id;

  -- Verificar se há pendências de separação ou conferência pelo status_venda
  IF v_status_venda IN ('aguardando_separacao', 'em_separacao', 'separado', 'conferencia_pendente') THEN
    RETURN false;
  END IF;

  -- Retornar true apenas se não houver status (array vazio)
  RETURN array_length(v_status_codes, 1) IS NULL;
END;
$$;

-- 5. Criar função para verificar se tem status específico
CREATE OR REPLACE FUNCTION public.has_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_codes text[];
BEGIN
  -- Buscar status da venda
  SELECT COALESCE(status_codes, '{}')
  INTO v_status_codes
  FROM public.sales
  WHERE id = p_sale_id;

  -- Verificar se o status existe no array
  RETURN p_status_code = ANY(v_status_codes);
END;
$$;

-- 6. Criar trigger para garantir que status_codes nunca seja NULL
CREATE OR REPLACE FUNCTION public.ensure_status_codes_not_null()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status_codes IS NULL THEN
    NEW.status_codes := '{}';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_sales_status_codes_not_null ON public.sales;
CREATE TRIGGER ensure_sales_status_codes_not_null
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_status_codes_not_null();

-- 7. Comentários para documentação
COMMENT ON COLUMN public.sales.status_codes IS 'Array de códigos de status de pendências: E (Estoque), C (Crédito), D (Desconto)';
COMMENT ON FUNCTION public.add_sale_status IS 'Adiciona um código de status à venda se ainda não existir';
COMMENT ON FUNCTION public.remove_sale_status IS 'Remove um código de status da venda';
COMMENT ON FUNCTION public.can_invoice_sale IS 'Retorna true se a venda pode ser faturada (sem pendências)';
COMMENT ON FUNCTION public.has_sale_status IS 'Retorna true se a venda possui o status especificado';

