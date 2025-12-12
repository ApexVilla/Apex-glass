-- 🔧 CORREÇÃO DO ERRO 500 NA TABELA ROLES
-- Copie e cole este SQL no Supabase Dashboard > SQL Editor > Run
-- Este script corrige o erro de recursão infinita nas políticas RLS da tabela roles

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

-- 2. Remover TODAS as políticas problemáticas da tabela roles
DROP POLICY IF EXISTS "Apenas admins podem gerenciar roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Todos podem visualizar roles" ON public.roles;
DROP POLICY IF EXISTS "Users can view roles in their company or global roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can create roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Only admins can delete non-system roles" ON public.roles;

-- 3. Criar políticas corretas que não causam recursão
-- SELECT: Todos os usuários autenticados podem visualizar roles
CREATE POLICY "Authenticated users can view all roles"
ON public.roles FOR SELECT
TO authenticated
USING (true);

-- INSERT: Apenas admins podem criar roles
CREATE POLICY "Only admins can create roles"
ON public.roles FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin());

-- UPDATE: Apenas admins podem atualizar roles
CREATE POLICY "Only admins can update roles"
ON public.roles FOR UPDATE
TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- DELETE: Apenas admins podem deletar roles (exceto roles do sistema)
CREATE POLICY "Only admins can delete non-system roles"
ON public.roles FOR DELETE
TO authenticated
USING (
  public.is_user_admin() 
  AND (is_system IS NULL OR is_system = false)
);

-- 4. Comentário na função
COMMENT ON FUNCTION public.is_user_admin IS 'Verifica se o usuário é admin, contornando políticas RLS para evitar recursão';

