-- ============================================
-- MOTOR FISCAL - TABELAS COMPLETAS
-- ============================================

-- Tabela principal de Notas Fiscais
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Identificação
    tipo TEXT NOT NULL CHECK (tipo IN ('nfe', 'nfse', 'mista')),
    tipo_operacao TEXT NOT NULL CHECK (tipo_operacao IN ('entrada', 'saida')),
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '55', -- 55=NFe, SE=NFSe
    chave_acesso TEXT,
    
    -- Datas
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_saida_entrada DATE,
    data_vencimento DATE,
    
    -- Emitente (JSON)
    emitente JSONB NOT NULL,
    
    -- Destinatário (JSON)
    destinatario JSONB NOT NULL,
    
    -- Dados Fiscais
    natureza_operacao TEXT,
    cfop TEXT,
    finalidade TEXT DEFAULT 'normal' CHECK (finalidade IN ('normal', 'complementar', 'ajuste', 'devolucao')),
    regime_tributario TEXT DEFAULT 'simples_nacional' CHECK (regime_tributario IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
    
    -- Totais (JSON)
    totais JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Impostos Totais (JSON)
    impostos_totais JSONB DEFAULT '{}'::jsonb,
    
    -- Transporte (JSON - NFe)
    transporte JSONB,
    
    -- Pagamento (JSON - NFe)
    pagamento JSONB,
    
    -- Status
    status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'validada', 'assinada', 'enviada', 'autorizada', 'cancelada', 'denegada')),
    precisa_validacao_fiscal BOOLEAN DEFAULT true,
    
    -- XML
    xml TEXT,
    xml_assinado TEXT,
    xml_enviado TEXT,
    protocolo_autorizacao TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- Tabela de Itens da Nota Fiscal
CREATE TABLE IF NOT EXISTS public.nota_fiscal_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE NOT NULL,
    
    -- Sequência
    sequencia INTEGER NOT NULL,
    
    -- Tipo
    tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'servico')),
    
    -- Produto/Serviço
    produto_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    servico_id UUID, -- Referência futura a tabela de serviços
    
    -- Dados do Item
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ncm TEXT, -- Para produtos
    codigo_servico TEXT, -- Para serviços
    unidade TEXT NOT NULL DEFAULT 'UN',
    quantidade NUMERIC(15,4) NOT NULL DEFAULT 1,
    
    -- Valores
    valor_unitario NUMERIC(15,4) NOT NULL DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(15,2) DEFAULT 0,
    valor_frete NUMERIC(15,2) DEFAULT 0,
    valor_seguro NUMERIC(15,2) DEFAULT 0,
    valor_outras_despesas NUMERIC(15,2) DEFAULT 0,
    
    -- Dados Fiscais
    cfop TEXT, -- Para produtos
    cst TEXT,
    csosn TEXT,
    
    -- Impostos do Item (JSON)
    impostos_item JSONB DEFAULT '{}'::jsonb,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(nota_id, sequencia)
);

-- Tabela de Logs Fiscais
CREATE TABLE IF NOT EXISTS public.fiscal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE NOT NULL,
    
    -- Tipo de Alteração
    tipo_alteracao TEXT NOT NULL CHECK (tipo_alteracao IN ('recalculo', 'validacao', 'geracao_xml', 'envio', 'autorizacao', 'cancelamento')),
    
    -- Dados da Alteração
    campo_alterado TEXT,
    valor_anterior JSONB,
    valor_novo JSONB,
    dados_completos JSONB,
    
    -- Usuário
    usuario_id UUID REFERENCES auth.users(id),
    
    -- Data
    data TIMESTAMPTZ DEFAULT now(),
    
    -- Observação
    observacao TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_company ON public.notas_fiscais(company_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tipo ON public.notas_fiscais(tipo);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_chave ON public.notas_fiscais(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nota_fiscal_itens_nota ON public.nota_fiscal_itens(nota_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_nota ON public.fiscal_logs(nota_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_data ON public.fiscal_logs(data);

-- RLS (Row Level Security)
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_fiscal_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their company notes"
    ON public.notas_fiscais FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert notes for their company"
    ON public.notas_fiscais FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update notes from their company"
    ON public.notas_fiscais FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete notes from their company"
    ON public.notas_fiscais FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Políticas para itens
CREATE POLICY "Users can view items from their company notes"
    ON public.nota_fiscal_itens FOR SELECT
    USING (
        nota_id IN (
            SELECT id FROM public.notas_fiscais 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage items from their company notes"
    ON public.nota_fiscal_itens FOR ALL
    USING (
        nota_id IN (
            SELECT id FROM public.notas_fiscais 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Políticas para logs
CREATE POLICY "Users can view logs from their company notes"
    ON public.fiscal_logs FOR SELECT
    USING (
        nota_id IN (
            SELECT id FROM public.notas_fiscais 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert logs for their company notes"
    ON public.fiscal_logs FOR INSERT
    WITH CHECK (
        nota_id IN (
            SELECT id FROM public.notas_fiscais 
            WHERE company_id IN (
                SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notas_fiscais_updated_at 
    BEFORE UPDATE ON public.notas_fiscais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nota_fiscal_itens_updated_at 
    BEFORE UPDATE ON public.nota_fiscal_itens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

