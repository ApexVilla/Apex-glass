-- ============================================
-- GARANTIR QUE A TABELA SUPPLIERS EXISTA
-- Cria a tabela se não existir ou atualiza se necessário
-- ============================================

-- Criar tabela suppliers se não existir
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo_pessoa text CHECK (tipo_pessoa IN ('PF', 'PJ')),
  nome_razao text NOT NULL,
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
  pais text DEFAULT 'Brasil',
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
  tipo_conta text CHECK (tipo_conta IN ('Corrente', 'Poupança', 'PJ')),
  pix text,
  limite_credito numeric(15,2),
  condicao_pagamento text,
  metodo_pagamento text,
  retencao_impostos boolean DEFAULT false,
  impostos_retidos jsonb,
  regime_icms text,
  indicador_contribuinte text CHECK (indicador_contribuinte IN ('Contribuinte', 'Não Contribuinte', 'Isento')),
  cod_municipio text,
  aliquota_iss numeric(5,2),
  lista_servicos text,
  retem_iss boolean DEFAULT false,
  ativo boolean DEFAULT true,
  categoria text,
  prioridade text CHECK (prioridade IN ('Alto', 'Médio', 'Baixo')),
  is_transportadora boolean DEFAULT false,
  emite_nfe boolean DEFAULT false,
  emite_nfse boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Adicionar company_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar campos que podem estar faltando
DO $$
BEGIN
  -- Adicionar site se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'site'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN site text;
  END IF;

  -- Adicionar prazo_entrega se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'prazo_entrega'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN prazo_entrega text;
  END IF;

  -- Adicionar linha_produtos se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'linha_produtos'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN linha_produtos text;
  END IF;

  -- Adicionar tipo_conta com valor 'PJ' se não existir na constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'tipo_conta'
  ) THEN
    -- Remover constraint antiga se existir
    ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_tipo_conta_check;
    -- Adicionar nova constraint com 'PJ'
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_tipo_conta_check 
      CHECK (tipo_conta IS NULL OR tipo_conta IN ('Corrente', 'Poupança', 'PJ'));
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers in their company" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete suppliers in their company" ON public.suppliers;

-- Criar função get_user_company_id se não existir
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Criar políticas RLS baseadas em company_id
CREATE POLICY "Users can view suppliers in their company"
  ON public.suppliers FOR SELECT
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can insert suppliers in their company"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can update suppliers in their company"
  ON public.suppliers FOR UPDATE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can delete suppliers in their company"
  ON public.suppliers FOR DELETE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_nome_razao ON public.suppliers(nome_razao);
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf_cnpj ON public.suppliers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_suppliers_ativo ON public.suppliers(ativo) WHERE ativo = true;

-- Criar função update_updated_at_column se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS handle_updated_at ON public.suppliers;
DROP TRIGGER IF EXISTS handle_suppliers_updated_at ON public.suppliers;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;

-- Criar trigger para updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

