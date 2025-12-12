-- ============================================
-- PARTE 1: CRIAR TABELA usuarios_empresas
-- Execute esta parte primeiro
-- ============================================

CREATE TABLE IF NOT EXISTS public.usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_usuario ON public.usuarios_empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON public.usuarios_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_active ON public.usuarios_empresas(usuario_id, is_active) WHERE is_active = true;

INSERT INTO public.usuarios_empresas (usuario_id, empresa_id, is_active)
SELECT DISTINCT id, company_id, true
FROM public.profiles
WHERE company_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

INSERT INTO public.usuarios_empresas (usuario_id, empresa_id, is_active)
SELECT DISTINCT user_id, company_id, true
FROM public.user_roles
WHERE company_id IS NOT NULL
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

