-- ============================================
-- ATUALIZAÇÃO COMPLETA DA TABELA FINANCIAL_NATURES
-- Módulo de Cadastro de Naturezas Financeiras
-- ============================================

-- Adicionar novos campos à tabela financial_natures
ALTER TABLE public.financial_natures
ADD COLUMN IF NOT EXISTS usada_em_vendas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usada_em_compras BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usada_em_despesas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usada_no_caixa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gerar_automatico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS permitir_edicao BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Atualizar campos existentes para garantir valores padrão corretos
UPDATE public.financial_natures
SET 
  usada_em_vendas = COALESCE(appears_in_receivables, false),
  usada_em_compras = COALESCE(appears_in_payables, false),
  usada_em_despesas = COALESCE(appears_in_payables, false),
  usada_no_caixa = true
WHERE usada_em_vendas IS NULL OR usada_em_compras IS NULL;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.financial_natures.usada_em_vendas IS 'Indica se a natureza pode ser usada no módulo de vendas';
COMMENT ON COLUMN public.financial_natures.usada_em_compras IS 'Indica se a natureza pode ser usada no módulo de compras';
COMMENT ON COLUMN public.financial_natures.usada_em_despesas IS 'Indica se a natureza pode ser usada em despesas';
COMMENT ON COLUMN public.financial_natures.usada_no_caixa IS 'Indica se a natureza pode ser usada em movimentações de caixa/tesouraria';
COMMENT ON COLUMN public.financial_natures.gerar_automatico IS 'Indica se deve gerar lançamento automático quando usado';
COMMENT ON COLUMN public.financial_natures.permitir_edicao IS 'Indica se permite edição após criação';
COMMENT ON COLUMN public.financial_natures.descricao IS 'Campo para observações gerais sobre a natureza';

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_financial_natures_usada_em_vendas ON public.financial_natures(usada_em_vendas) WHERE usada_em_vendas = true;
CREATE INDEX IF NOT EXISTS idx_financial_natures_usada_em_compras ON public.financial_natures(usada_em_compras) WHERE usada_em_compras = true;
CREATE INDEX IF NOT EXISTS idx_financial_natures_usada_no_caixa ON public.financial_natures(usada_no_caixa) WHERE usada_no_caixa = true;
CREATE INDEX IF NOT EXISTS idx_financial_natures_tipo ON public.financial_natures(type);
CREATE INDEX IF NOT EXISTS idx_financial_natures_status ON public.financial_natures(is_active) WHERE is_active = true;

