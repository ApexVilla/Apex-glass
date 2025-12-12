-- ============================================
-- MÓDULO COMPLETO DE NOTA FISCAL
-- ============================================

-- ENUMs para o módulo de Nota Fiscal
CREATE TYPE public.invoice_type AS ENUM ('entrada', 'saida', 'devolucao', 'servico');
CREATE TYPE public.invoice_status AS ENUM ('rascunho', 'confirmada', 'cancelada');
CREATE TYPE public.finalidade_nf AS ENUM ('normal', 'complementar', 'ajuste', 'devolucao', 'remessa_conserto', 'remessa_retorno');

-- Tabela de Estabelecimentos (Lojas)
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  inscricao_estadual TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Tabela de Fornecedores
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  inscricao_estadual TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  seller_1 TEXT,
  seller_2 TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Tabela principal de Notas Fiscais
CREATE TABLE public.invoice_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  
  -- Dados da Nota
  serie TEXT,
  subserie TEXT,
  modelo_documento TEXT DEFAULT '55', -- 55 = NF-e, 01 = NF modelo 1/1A
  numero_nota INTEGER NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_saida DATE,
  hora_saida TIME,
  data_entrada DATE,
  tipo invoice_type NOT NULL DEFAULT 'entrada',
  transportador_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  finalidade finalidade_nf DEFAULT 'normal',
  mensagens_observacoes TEXT,
  
  -- Opções Fiscais (Checkboxes)
  incide_despesas_base_ipi BOOLEAN DEFAULT false,
  incide_despesas_base_icms BOOLEAN DEFAULT false,
  atualiza_custo_compra BOOLEAN DEFAULT false,
  atualiza_custo_reposicao BOOLEAN DEFAULT false,
  confirmado BOOLEAN DEFAULT false,
  ipi_compõe_base_icms BOOLEAN DEFAULT false,
  compra_orgao_publico BOOLEAN DEFAULT false,
  
  -- Valores Destacados na Nota
  total_nota DECIMAL(15,2) DEFAULT 0,
  frete DECIMAL(15,2) DEFAULT 0,
  seguro DECIMAL(15,2) DEFAULT 0,
  outras_despesas DECIMAL(15,2) DEFAULT 0,
  acrescimo_financeiro DECIMAL(15,2) DEFAULT 0,
  desconto_corporativo DECIMAL(15,2) DEFAULT 0,
  
  -- Valores que NÃO compõem o total
  percentual_frete DECIMAL(5,2) DEFAULT 0,
  valor_frete DECIMAL(15,2) DEFAULT 0,
  percentual_seguro DECIMAL(5,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  icms_integral DECIMAL(15,2) DEFAULT 0,
  acrescimo_financeiro_st DECIMAL(15,2) DEFAULT 0,
  valor_suframa DECIMAL(15,2) DEFAULT 0,
  
  -- Resumo dos Totais
  desconto_itens DECIMAL(15,2) DEFAULT 0,
  desconto_corpo DECIMAL(15,2) DEFAULT 0,
  total_descontos DECIMAL(15,2) DEFAULT 0,
  total_liquido DECIMAL(15,2) DEFAULT 0,
  total_itens DECIMAL(15,2) DEFAULT 0,
  
  -- Tributos da Nota (Resumo)
  base_calculo_icms DECIMAL(15,2) DEFAULT 0,
  valor_icms DECIMAL(15,2) DEFAULT 0,
  base_icms_subst DECIMAL(15,2) DEFAULT 0,
  valor_icms_subst DECIMAL(15,2) DEFAULT 0,
  base_calculo_ipi DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  base_iss DECIMAL(15,2) DEFAULT 0,
  valor_iss DECIMAL(15,2) DEFAULT 0,
  base_iss_st DECIMAL(15,2) DEFAULT 0,
  valor_iss_st DECIMAL(15,2) DEFAULT 0,
  outras_tributacoes DECIMAL(15,2) DEFAULT 0,
  
  -- Dados Financeiros
  total_parcial DECIMAL(15,2) DEFAULT 0,
  total_parcelas DECIMAL(15,2) DEFAULT 0,
  total_retencoes DECIMAL(15,2) DEFAULT 0,
  valor_restante DECIMAL(15,2) DEFAULT 0,
  
  status invoice_status DEFAULT 'rascunho',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, establishment_id, numero_nota, serie, modelo_documento)
);

-- Tabela de Itens da Nota Fiscal
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoice_headers(id) ON DELETE CASCADE NOT NULL,
  sequence INTEGER NOT NULL,
  
  -- Dados do Item
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  codigo_item TEXT,
  nome_item TEXT NOT NULL,
  nome_variavel TEXT,
  deposito_id UUID, -- Referência futura a tabela de depósitos
  unidade TEXT DEFAULT 'UN',
  marca TEXT,
  ncm TEXT,
  codigo_fabricacao TEXT,
  referencia_fornecedor TEXT,
  cfop TEXT,
  embalagem TEXT,
  
  -- Tributação
  condicao_icms TEXT,
  aliquota_icms DECIMAL(5,2) DEFAULT 0,
  aliquota_ipi DECIMAL(5,2) DEFAULT 0,
  
  -- Valores
  preco_unitario DECIMAL(15,4) NOT NULL DEFAULT 0,
  quantidade DECIMAL(15,4) NOT NULL DEFAULT 1,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  percentual_desconto DECIMAL(5,2) DEFAULT 0,
  percentual_margem DECIMAL(5,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Custos (para estoque)
  custo_compra DECIMAL(15,2) DEFAULT 0,
  custo_reposicao DECIMAL(15,2) DEFAULT 0,
  custo_medio DECIMAL(15,2) DEFAULT 0,
  custo_personalizado DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Tributação Detalhada dos Itens
CREATE TABLE public.invoice_item_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE CASCADE NOT NULL,
  
  -- ISS
  aliquota_iss DECIMAL(5,2) DEFAULT 0,
  base_calculo_iss DECIMAL(15,2) DEFAULT 0,
  valor_iss DECIMAL(15,2) DEFAULT 0,
  valor_isento_iss DECIMAL(15,2) DEFAULT 0,
  valor_outras_iss DECIMAL(15,2) DEFAULT 0,
  valor_nao_tributada_iss DECIMAL(15,2) DEFAULT 0,
  base_calculo_iss_subst DECIMAL(15,2) DEFAULT 0,
  valor_iss_subst DECIMAL(15,2) DEFAULT 0,
  item_lista_servicos TEXT,
  
  -- PIS/COFINS
  cst_pis TEXT,
  cst_cofins TEXT,
  base_pis DECIMAL(15,2) DEFAULT 0,
  base_cofins DECIMAL(15,2) DEFAULT 0,
  aliquota_pis DECIMAL(5,2) DEFAULT 0,
  aliquota_cofins DECIMAL(5,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  
  -- ICMS Retido Anteriormente
  base_icms_st_retido DECIMAL(15,2) DEFAULT 0,
  valor_icms_st_retido DECIMAL(15,2) DEFAULT 0,
  valor_icms_retido DECIMAL(15,2) DEFAULT 0,
  numero_documento_origem TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Parcelas Financeiras (Duplicatas)
CREATE TABLE public.invoice_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoice_headers(id) ON DELETE CASCADE NOT NULL,
  numero INTEGER NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  portador TEXT,
  status payment_status DEFAULT 'pending',
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Retenções
CREATE TABLE public.invoice_retentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoice_headers(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL, -- 'ISS', 'IRRF', 'PIS', 'COFINS', 'CSLL', etc.
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  base_calculo DECIMAL(15,2) DEFAULT 0,
  aliquota DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Anexos (PDF, XML)
CREATE TABLE public.invoice_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoice_headers(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'xml', 'image'
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_item_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_retentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Establishments
CREATE POLICY "Users can manage establishments in their company"
ON public.establishments FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- Suppliers
CREATE POLICY "Users can manage suppliers in their company"
ON public.suppliers FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- Invoice Headers
CREATE POLICY "Users can manage invoices in their company"
ON public.invoice_headers FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- Invoice Items
CREATE POLICY "Users can manage invoice items"
ON public.invoice_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_headers ih
    WHERE ih.id = invoice_id
    AND ih.company_id = public.get_user_company_id()
  )
);

-- Invoice Item Taxes
CREATE POLICY "Users can manage invoice item taxes"
ON public.invoice_item_taxes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_items ii
    JOIN public.invoice_headers ih ON ih.id = ii.invoice_id
    WHERE ii.id = invoice_item_id
    AND ih.company_id = public.get_user_company_id()
  )
);

-- Invoice Installments
CREATE POLICY "Users can manage invoice installments"
ON public.invoice_installments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_headers ih
    WHERE ih.id = invoice_id
    AND ih.company_id = public.get_user_company_id()
  )
);

-- Invoice Retentions
CREATE POLICY "Users can manage invoice retentions"
ON public.invoice_retentions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_headers ih
    WHERE ih.id = invoice_id
    AND ih.company_id = public.get_user_company_id()
  )
);

-- Invoice Attachments
CREATE POLICY "Users can manage invoice attachments"
ON public.invoice_attachments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice_headers ih
    WHERE ih.id = invoice_id
    AND ih.company_id = public.get_user_company_id()
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_headers_updated_at
BEFORE UPDATE ON public.invoice_headers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_item_taxes_updated_at
BEFORE UPDATE ON public.invoice_item_taxes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_installments_updated_at
BEFORE UPDATE ON public.invoice_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTIONS PARA CÁLCULOS FISCAIS
-- ============================================

-- Função para calcular ICMS
CREATE OR REPLACE FUNCTION public.calculate_icms(
  base_calculo DECIMAL,
  aliquota DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND((base_calculo * aliquota / 100)::numeric, 2);
END;
$$;

-- Função para calcular IPI
CREATE OR REPLACE FUNCTION public.calculate_ipi(
  base_calculo DECIMAL,
  aliquota DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND((base_calculo * aliquota / 100)::numeric, 2);
END;
$$;

-- Função para calcular ISS
CREATE OR REPLACE FUNCTION public.calculate_iss(
  base_calculo DECIMAL,
  aliquota DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND((base_calculo * aliquota / 100)::numeric, 2);
END;
$$;

-- Função para calcular PIS/COFINS
CREATE OR REPLACE FUNCTION public.calculate_pis_cofins(
  base_calculo DECIMAL,
  aliquota DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND((base_calculo * aliquota / 100)::numeric, 2);
END;
$$;

-- Função para atualizar totais da nota
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_itens DECIMAL(15,2);
  v_total_icms DECIMAL(15,2);
  v_total_ipi DECIMAL(15,2);
  v_total_iss DECIMAL(15,2);
  v_base_icms DECIMAL(15,2);
  v_base_ipi DECIMAL(15,2);
  v_base_iss DECIMAL(15,2);
BEGIN
  -- Calcular totais dos itens
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COALESCE(SUM(valor_desconto), 0)
  INTO v_total_itens, v_total_icms
  FROM public.invoice_items
  WHERE invoice_id = NEW.invoice_id;
  
  -- Atualizar totais na nota
  UPDATE public.invoice_headers
  SET 
    total_itens = v_total_itens,
    desconto_itens = v_total_icms,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar totais quando item é inserido/atualizado
CREATE TRIGGER trigger_update_invoice_totals
AFTER INSERT OR UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_totals();

-- ============================================
-- INDEXES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_invoice_headers_company ON public.invoice_headers(company_id);
CREATE INDEX idx_invoice_headers_supplier ON public.invoice_headers(supplier_id);
CREATE INDEX idx_invoice_headers_numero ON public.invoice_headers(numero_nota, serie, modelo_documento);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON public.invoice_items(product_id);
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_establishments_company ON public.establishments(company_id);


