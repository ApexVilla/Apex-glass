-- =====================================================
-- SISTEMA DE OVERRIDE DE EMPRESA PARA MASTER USERS
-- =====================================================
-- Permite que usuários master troquem de empresa
-- e que as políticas RLS respeitem essa troca
-- =====================================================

-- 1. Criar tabela para armazenar override de empresa por sessão
CREATE TABLE IF NOT EXISTS public.user_company_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_company_overrides_user_id ON public.user_company_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_overrides_company_id ON public.user_company_overrides(company_id);

-- Habilitar RLS
ALTER TABLE public.user_company_overrides ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários podem gerenciar apenas seus próprios overrides
CREATE POLICY "Users can manage their own company overrides"
ON public.user_company_overrides FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Função para definir override de empresa
CREATE OR REPLACE FUNCTION public.set_user_company_override(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se company_id for NULL, remover override
  IF p_company_id IS NULL THEN
    DELETE FROM public.user_company_overrides
    WHERE user_id = auth.uid();
    RETURN;
  END IF;
  
  -- Verificar se é master user (email específico)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND email IN ('villarroelsamir85@gmail.com', 'samir@apexglass.com')
  ) THEN
    RAISE EXCEPTION 'Apenas usuários master podem usar override de empresa';
  END IF;
  
  -- Inserir ou atualizar override
  INSERT INTO public.user_company_overrides (user_id, company_id, expires_at)
  VALUES (auth.uid(), p_company_id, now() + INTERVAL '24 hours')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    company_id = EXCLUDED.company_id,
    expires_at = now() + INTERVAL '24 hours';
END;
$$;

-- 3. Atualizar função get_user_company_id para usar override quando existir
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override_company_id UUID;
  v_profile_company_id UUID;
BEGIN
  -- Primeiro, verificar se há override ativo
  SELECT company_id INTO v_override_company_id
  FROM public.user_company_overrides
  WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Se há override, retornar ele
  IF v_override_company_id IS NOT NULL THEN
    RETURN v_override_company_id;
  END IF;
  
  -- Caso contrário, retornar company_id do perfil
  SELECT company_id INTO v_profile_company_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_profile_company_id;
END;
$$;

-- 4. Comentários
COMMENT ON TABLE public.user_company_overrides IS 'Armazena override temporário de empresa para usuários master';
COMMENT ON FUNCTION public.set_user_company_override IS 'Define override de empresa para usuário master (válido por 24 horas)';
COMMENT ON FUNCTION public.get_user_company_id IS 'Retorna company_id do override se existir, caso contrário retorna company_id do perfil';




