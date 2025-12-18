-- Tabela para armazenar relatórios de verificação do sistema NF-e
CREATE TABLE IF NOT EXISTS public.nfe_verificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('ok', 'warning', 'error')),
  checks JSONB NOT NULL,
  summary JSONB NOT NULL,
  corrective_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nfe_verificacoes_company_id ON public.nfe_verificacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_nfe_verificacoes_timestamp ON public.nfe_verificacoes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nfe_verificacoes_overall_status ON public.nfe_verificacoes(overall_status);

-- Enable RLS
ALTER TABLE public.nfe_verificacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Usuários podem ver verificações da própria empresa
CREATE POLICY "Users can view verifications in their company"
ON public.nfe_verificacoes
FOR SELECT
USING (company_id = get_user_company_id());

-- RLS Policy: Usuários podem inserir verificações na própria empresa
CREATE POLICY "Users can insert verifications in their company"
ON public.nfe_verificacoes
FOR INSERT
WITH CHECK (company_id = get_user_company_id());

-- Comentários
COMMENT ON TABLE public.nfe_verificacoes IS 'Armazena relatórios de verificação do sistema NF-e e certificado A1';
COMMENT ON COLUMN public.nfe_verificacoes.checks IS 'JSON com resultados detalhados de cada verificação';
COMMENT ON COLUMN public.nfe_verificacoes.summary IS 'JSON com resumo estatístico das verificações';
COMMENT ON COLUMN public.nfe_verificacoes.corrective_actions IS 'Array de ações corretivas recomendadas';

