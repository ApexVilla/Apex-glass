-- Script SQL para criar a tabela invoice_headers manualmente
-- Execute este script no SQL Editor do Supabase se a migration não foi aplicada

-- Criar tipos ENUM se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
        CREATE TYPE public.invoice_type AS ENUM ('entrada', 'saida', 'devolucao', 'servico');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('rascunho', 'confirmada', 'cancelada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finalidade_nf') THEN
        CREATE TYPE public.finalidade_nf AS ENUM ('normal', 'complementar', 'ajuste', 'devolucao', 'remessa_conserto', 'remessa_retorno');
    END IF;
END $$;

-- Criar tabela invoice_headers se não existir
CREATE TABLE IF NOT EXISTS public.invoice_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    establishment_id UUID,
    supplier_id UUID,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    
    -- Dados da Nota
    serie TEXT,
    subserie TEXT,
    modelo_documento TEXT DEFAULT '55',
    numero_nota INTEGER NOT NULL,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_saida DATE,
    hora_saida TIME,
    data_entrada DATE,
    tipo invoice_type NOT NULL DEFAULT 'entrada',
    transportador_id UUID,
    finalidade finalidade_nf DEFAULT 'normal',
    mensagens_observacoes TEXT,
    natureza_operacao TEXT,
    
    -- Opções Fiscais
    incide_despesas_base_ipi BOOLEAN DEFAULT false,
    incide_despesas_base_icms BOOLEAN DEFAULT false,
    atualiza_custo_compra BOOLEAN DEFAULT false,
    atualiza_custo_reposicao BOOLEAN DEFAULT false,
    confirmado BOOLEAN DEFAULT false,
    ipi_compoe_base_icms BOOLEAN DEFAULT false,
    compra_orgao_publico BOOLEAN DEFAULT false,
    
    -- Valores
    total_nota DECIMAL(15,2) DEFAULT 0,
    frete DECIMAL(15,2) DEFAULT 0,
    seguro DECIMAL(15,2) DEFAULT 0,
    outras_despesas DECIMAL(15,2) DEFAULT 0,
    acrescimo_financeiro DECIMAL(15,2) DEFAULT 0,
    desconto_corporativo DECIMAL(15,2) DEFAULT 0,
    percentual_frete DECIMAL(5,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    percentual_seguro DECIMAL(5,2) DEFAULT 0,
    valor_seguro DECIMAL(15,2) DEFAULT 0,
    icms_integral DECIMAL(15,2) DEFAULT 0,
    acrescimo_financeiro_st DECIMAL(15,2) DEFAULT 0,
    valor_suframa DECIMAL(15,2) DEFAULT 0,
    
    -- Status e controle SEFAZ
    status invoice_status DEFAULT 'rascunho',
    ambiente_sefaz TEXT DEFAULT 'homologacao',
    status_envio_sefaz TEXT,
    mensagem_retorno_sefaz TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.invoice_headers ENABLE ROW LEVEL SECURITY;

-- Criar política básica de RLS se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'invoice_headers' 
        AND policyname = 'Users can manage invoice_headers in their company'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can manage invoice_headers in their company"
        ON public.invoice_headers
        FOR ALL
        USING (company_id = public.get_user_company_id())';
    END IF;
END $$;

-- Criar trigger para updated_at se não existir
DROP TRIGGER IF EXISTS update_invoice_headers_updated_at ON public.invoice_headers;
CREATE TRIGGER update_invoice_headers_updated_at
BEFORE UPDATE ON public.invoice_headers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_invoice_headers_company ON public.invoice_headers(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_customer ON public.invoice_headers(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_numero ON public.invoice_headers(numero_nota, serie, modelo_documento);

