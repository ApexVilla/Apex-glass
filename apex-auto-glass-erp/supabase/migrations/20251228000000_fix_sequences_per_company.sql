-- ============================================
-- CORRIGIR SEQUÊNCIAS POR EMPRESA
-- ============================================
-- Este script corrige o problema onde vendas, pedidos e notas fiscais
-- compartilhavam a mesma sequência entre empresas.
-- Agora cada empresa terá sua própria sequência separada.

-- ============================================
-- 1. CORRIGIR SEQUÊNCIA DE VENDAS (sale_number)
-- ============================================

-- Remover a sequência global e converter para INTEGER
ALTER TABLE public.sales 
  ALTER COLUMN sale_number DROP DEFAULT;

-- Remover a sequência antiga se existir
DROP SEQUENCE IF EXISTS public.sales_sale_number_seq;

-- Função para gerar próximo número de venda por empresa
CREATE OR REPLACE FUNCTION public.get_next_sale_number(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Buscar o maior número de venda para esta empresa e adicionar 1
  SELECT COALESCE(MAX(sale_number), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE company_id = p_company_id;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para gerar sale_number automaticamente
CREATE OR REPLACE FUNCTION public.set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Se sale_number não foi fornecido, gerar automaticamente
  IF NEW.sale_number IS NULL OR NEW.sale_number = 0 THEN
    NEW.sale_number := public.get_next_sale_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS set_sale_number_trigger ON public.sales;

-- Criar novo trigger
CREATE TRIGGER set_sale_number_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sale_number();

-- ============================================
-- 2. CORRIGIR SEQUÊNCIA DE PEDIDOS (order_number)
-- ============================================

-- Remover a sequência global e converter para INTEGER
ALTER TABLE public.service_orders 
  ALTER COLUMN order_number DROP DEFAULT;

-- Remover a sequência antiga se existir
DROP SEQUENCE IF EXISTS public.service_orders_order_number_seq;

-- Função para gerar próximo número de pedido por empresa
CREATE OR REPLACE FUNCTION public.get_next_order_number(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Buscar o maior número de pedido para esta empresa e adicionar 1
  SELECT COALESCE(MAX(order_number), 0) + 1
  INTO next_num
  FROM public.service_orders
  WHERE company_id = p_company_id;
  
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para gerar order_number automaticamente
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Se order_number não foi fornecido, gerar automaticamente
  IF NEW.order_number IS NULL OR NEW.order_number = 0 THEN
    NEW.order_number := public.get_next_order_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.service_orders;

-- Criar novo trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- ============================================
-- 3. CORRIGIR SEQUÊNCIA DE NOTAS FISCAIS (invoice_number)
-- ============================================

-- Verificar se a tabela invoices existe e tem invoice_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'invoice_number'
  ) THEN
    -- Remover a sequência global e converter para INTEGER
    ALTER TABLE public.invoices 
      ALTER COLUMN invoice_number DROP DEFAULT;

    -- Remover a sequência antiga se existir
    DROP SEQUENCE IF EXISTS public.invoices_invoice_number_seq;

    -- Função para gerar próximo número de nota fiscal por empresa
    CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_company_id UUID)
    RETURNS INTEGER AS $$
    DECLARE
      next_num INTEGER;
    BEGIN
      -- Buscar o maior número de nota fiscal para esta empresa e adicionar 1
      SELECT COALESCE(MAX(invoice_number), 0) + 1
      INTO next_num
      FROM public.invoices
      WHERE company_id = p_company_id;
      
      RETURN next_num;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Trigger para gerar invoice_number automaticamente
    CREATE OR REPLACE FUNCTION public.set_invoice_number()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Se invoice_number não foi fornecido, gerar automaticamente
      IF NEW.invoice_number IS NULL OR NEW.invoice_number = 0 THEN
        NEW.invoice_number := public.get_next_invoice_number(NEW.company_id);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Remover trigger antigo se existir
    DROP TRIGGER IF EXISTS set_invoice_number_trigger ON public.invoices;

    -- Criar novo trigger
    CREATE TRIGGER set_invoice_number_trigger
      BEFORE INSERT ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.set_invoice_number();
  END IF;
END $$;

-- ============================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION public.get_next_sale_number(UUID) IS 
  'Gera o próximo número de venda sequencial para uma empresa específica';

COMMENT ON FUNCTION public.get_next_order_number(UUID) IS 
  'Gera o próximo número de pedido sequencial para uma empresa específica';

COMMENT ON FUNCTION public.get_next_invoice_number(UUID) IS 
  'Gera o próximo número de nota fiscal sequencial para uma empresa específica';

COMMENT ON COLUMN public.sales.sale_number IS 
  'Número sequencial de venda, único por empresa (não global)';

COMMENT ON COLUMN public.service_orders.order_number IS 
  'Número sequencial de pedido, único por empresa (não global)';

-- ============================================
-- 5. VERIFICAÇÃO E TESTE
-- ============================================

-- Verificar se as funções foram criadas
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SEQUÊNCIAS POR EMPRESA CONFIGURADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '  ✅ get_next_sale_number()';
  RAISE NOTICE '  ✅ get_next_order_number()';
  RAISE NOTICE '  ✅ get_next_invoice_number() (se aplicável)';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers criados:';
  RAISE NOTICE '  ✅ set_sale_number_trigger';
  RAISE NOTICE '  ✅ set_order_number_trigger';
  RAISE NOTICE '  ✅ set_invoice_number_trigger (se aplicável)';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora cada empresa terá suas próprias sequências:';
  RAISE NOTICE '  - Apexvilla: vendas #1, #2, #3...';
  RAISE NOTICE '  - TM Parabrisa: vendas #1, #2, #3...';
  RAISE NOTICE '  (separadas e independentes)';
  RAISE NOTICE '========================================';
END $$;






