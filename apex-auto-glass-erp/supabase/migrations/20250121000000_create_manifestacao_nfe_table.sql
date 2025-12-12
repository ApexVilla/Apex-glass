-- Tabela para rastreamento de manifestações do destinatário
CREATE TABLE IF NOT EXISTS manifestacao_nfe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nf_entrada_id UUID REFERENCES nf_entrada(id) ON DELETE CASCADE,
    chave_acesso TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('210100', '210200', '210240', '210250')),
    -- Tipo de manifestação:
    -- '210100' = Ciência da Operação
    -- '210200' = Confirmação da Operação
    -- '210240' = Desconhecimento da Operação
    -- '210250' = Operação Não Realizada
    protocolo TEXT, -- Protocolo de recebimento do evento pela SEFAZ
    sequencia INTEGER DEFAULT 1, -- Número sequencial do evento (para múltiplas manifestações)
    xml_evento TEXT, -- XML do evento enviado
    xml_retorno TEXT, -- XML de retorno da SEFAZ
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'processado', 'erro')),
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_recebimento TIMESTAMP WITH TIME ZONE, -- Data de recebimento do protocolo
    justificativa TEXT, -- Justificativa (obrigatória para alguns tipos)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    usuario_id UUID REFERENCES auth.users(id),
    mensagem_erro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_manifestacao_nfe_chave ON manifestacao_nfe(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_manifestacao_nfe_nf_entrada ON manifestacao_nfe(nf_entrada_id);
CREATE INDEX IF NOT EXISTS idx_manifestacao_nfe_company ON manifestacao_nfe(company_id);
CREATE INDEX IF NOT EXISTS idx_manifestacao_nfe_status ON manifestacao_nfe(status);
CREATE INDEX IF NOT EXISTS idx_manifestacao_nfe_tipo ON manifestacao_nfe(tipo);

-- Enable RLS
ALTER TABLE manifestacao_nfe ENABLE ROW LEVEL SECURITY;

-- Policy para RLS
CREATE POLICY "Users can manage manifestations in their company" ON manifestacao_nfe
    FOR ALL USING (company_id = get_user_company_id());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_manifestacao_nfe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manifestacao_nfe_updated_at
    BEFORE UPDATE ON manifestacao_nfe
    FOR EACH ROW
    EXECUTE FUNCTION update_manifestacao_nfe_updated_at();

-- Comentários
COMMENT ON TABLE manifestacao_nfe IS 'Tabela para rastreamento de manifestações do destinatário (eventos 210100, 210200, 210240, 210250)';
COMMENT ON COLUMN manifestacao_nfe.tipo IS 'Tipo de manifestação conforme código da SEFAZ';
COMMENT ON COLUMN manifestacao_nfe.protocolo IS 'Protocolo de recebimento do evento pela SEFAZ';
COMMENT ON COLUMN manifestacao_nfe.sequencia IS 'Número sequencial do evento (incrementa a cada manifestação da mesma NF)';

