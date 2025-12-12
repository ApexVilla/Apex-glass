-- =====================================================
-- MIGRATION: ADICIONAR PERMISSÕES INDIVIDUAIS (OVERRIDES)
-- =====================================================

-- 1. Criar tabela de permissões individuais
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  granted BOOLEAN NOT NULL, -- true = permitido (override allow), false = negado (override deny)
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, permission_id, company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies RLS
-- Admins podem gerenciar
CREATE POLICY "Only admins can manage user permissions"
ON public.user_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- Usuários podem ver suas próprias permissões (opcional, mas útil para debug)
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- 2. Atualizar função has_permission para considerar overrides
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_module_slug TEXT,
  p_action permission_action
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_user_profile RECORD;
  v_override_granted BOOLEAN;
BEGIN
  -- Buscar perfil do usuário
  SELECT company_id, role INTO v_user_profile
  FROM public.profiles
  WHERE id = p_user_id AND is_active = true;

  -- Se não encontrou perfil ou está inativo, negar
  IF NOT FOUND OR v_user_profile IS NULL THEN
    RETURN false;
  END IF;

  -- Administradores têm todas as permissões (exceto se explicitamente negado? Não, admin é supremo geralmente)
  -- Mas se quisermos permitir restringir admin, moveríamos isso para depois do check de override.
  -- Por enquanto, mantemos admin supremo.
  IF v_user_profile.role = 'admin' THEN
    RETURN true;
  END IF;

  -- 1. Verificar se existe override explícito na tabela user_permissions
  SELECT granted INTO v_override_granted
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  JOIN public.modules m ON p.module_id = m.id
  WHERE up.user_id = p_user_id
    AND (up.company_id IS NULL OR up.company_id = v_user_profile.company_id)
    AND m.slug = p_module_slug
    AND p.action = p_action;

  -- Se encontrou override, retorna o valor dele (true ou false)
  IF v_override_granted IS NOT NULL THEN
    RETURN v_override_granted;
  END IF;

  -- 2. Se não tem override, verificar permissões através das roles (comportamento padrão)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.modules m ON p.module_id = m.id
    WHERE ur.user_id = p_user_id
      AND ur.company_id = v_user_profile.company_id
      AND m.slug = p_module_slug
      AND p.action = p_action
      AND rp.granted = true
      AND m.is_active = true
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Comentários
COMMENT ON TABLE public.user_permissions IS 'Permissões individuais que sobrescrevem as roles (Grant ou Deny explícito)';
