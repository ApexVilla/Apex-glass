-- ============================================
-- INSERÇÃO DE NATUREZAS FINANCEIRAS PRÉ-CADASTRADAS
-- ============================================

-- Função para inserir naturezas padrão para uma empresa
CREATE OR REPLACE FUNCTION public.insert_default_financial_natures(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- NATUREZAS DE ENTRADA
  INSERT INTO public.financial_natures (
    company_id,
    type,
    name,
    code,
    category,
    subcategory,
    usada_em_vendas,
    usada_em_compras,
    usada_em_despesas,
    usada_no_caixa,
    gerar_automatico,
    permitir_edicao,
    is_active,
    appears_in_receivables,
    appears_in_payables,
    descricao
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

-- Trigger para inserir naturezas padrão quando uma nova empresa é criada
CREATE OR REPLACE FUNCTION public.create_default_natures_for_new_company()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.insert_default_financial_natures(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se não existir
DROP TRIGGER IF EXISTS trigger_create_default_natures ON public.companies;
CREATE TRIGGER trigger_create_default_natures
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_natures_for_new_company();

-- Inserir naturezas padrão para empresas existentes que não possuem naturezas
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT id FROM public.companies 
    WHERE id NOT IN (
      SELECT DISTINCT company_id FROM public.financial_natures
    )
  LOOP
    PERFORM public.insert_default_financial_natures(company_record.id);
  END LOOP;
END $$;

