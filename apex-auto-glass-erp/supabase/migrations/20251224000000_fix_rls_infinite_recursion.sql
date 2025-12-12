-- =====================================================
-- CORRIGIR RECURSÃO INFINITA NAS POLÍTICAS RLS
-- =====================================================
-- Este arquivo corrige o erro de recursão infinita nas políticas RLS
-- causado por políticas que acessam diretamente outras tabelas com RLS
-- =====================================================

-- 1. Criar função SECURITY DEFINER para verificar se usuário é admin
-- Esta função contorna as políticas RLS para evitar recursão
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
    AND role = 'admin'
    AND is_active = true
  )
$$;

-- 2. Criar função SECURITY DEFINER para obter company_id do usuário
-- (já existe, mas garantimos que está correta)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 3. Remover políticas antigas de roles que causam recursão
DROP POLICY IF EXISTS "Users can view roles in their company or global roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can delete non-system roles" ON public.roles;

-- 4. Recriar políticas de roles usando funções SECURITY DEFINER
-- Ver roles: usuários autenticados podem ver roles da sua empresa ou roles globais
CREATE POLICY "Users can view roles in their company or global roles"
ON public.roles FOR SELECT
TO authenticated
USING (
  company_id IS NULL OR 
  company_id = public.get_user_company_id()
);

-- Criar roles: apenas admins
CREATE POLICY "Only admins can create roles"
ON public.roles FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin());

-- Atualizar roles: apenas admins
CREATE POLICY "Only admins can update roles"
ON public.roles FOR UPDATE
TO authenticated
USING (public.is_user_admin());

-- Deletar roles: apenas admins e não pode deletar roles do sistema
CREATE POLICY "Only admins can delete non-system roles"
ON public.roles FOR DELETE
TO authenticated
USING (
  public.is_user_admin() 
  AND is_system = false
);

-- 5. Corrigir políticas de modules que também podem ter recursão
DROP POLICY IF EXISTS "Only admins can manage modules" ON public.modules;

CREATE POLICY "Only admins can manage modules"
ON public.modules FOR ALL
TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- 6. Corrigir políticas de permissions que também podem ter recursão
DROP POLICY IF EXISTS "Only admins can manage permissions" ON public.permissions;

CREATE POLICY "Only admins can manage permissions"
ON public.permissions FOR ALL
TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- 7. Corrigir políticas de role_permissions
DROP POLICY IF EXISTS "Users can view role permissions for accessible roles" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can manage role permissions" ON public.role_permissions;

-- Usuários podem ver role_permissions das roles que têm acesso
CREATE POLICY "Users can view role permissions for accessible roles"
ON public.role_permissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
    AND (
      r.company_id IS NULL OR
      r.company_id = public.get_user_company_id()
    )
  )
);

-- Apenas admins podem gerenciar role_permissions
CREATE POLICY "Only admins can manage role permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- 8. Corrigir políticas de audit_logs
DROP POLICY IF EXISTS "Users can view audit logs from their company" ON public.audit_logs;

CREATE POLICY "Users can view audit logs from their company"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR public.is_user_admin()
);

-- 9. Corrigir políticas de user_permissions (se existirem)
DO $$
BEGIN
  -- Verificar se a tabela existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_permissions'
  ) THEN
    -- Remover políticas antigas
    DROP POLICY IF EXISTS "Only admins can manage user permissions" ON public.user_permissions;
    DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
    
    -- Usuários podem ver suas próprias permissões
    CREATE POLICY "Users can view their own permissions"
    ON public.user_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
    
    -- Apenas admins podem gerenciar (INSERT, UPDATE, DELETE)
    CREATE POLICY "Only admins can manage user permissions"
    ON public.user_permissions FOR ALL
    TO authenticated
    USING (public.is_user_admin())
    WITH CHECK (public.is_user_admin());
  END IF;
END $$;

-- 10. Comentários
COMMENT ON FUNCTION public.is_user_admin IS 'Verifica se o usuário é admin, contornando políticas RLS para evitar recursão';
COMMENT ON FUNCTION public.get_user_company_id IS 'Obtém o company_id do usuário autenticado, contornando políticas RLS';

