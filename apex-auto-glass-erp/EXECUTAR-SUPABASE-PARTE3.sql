-- ============================================
-- PARTE 3: CRIAR FUNÇÕES RLS
-- Execute esta parte após a PARTE 2
-- ============================================

CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  BEGIN
    v_empresa_id := (current_setting('request.jwt.claims', true)::json->>'empresa_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;
  
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_empresa_access(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios_empresas 
    WHERE usuario_id = auth.uid() 
      AND empresa_id = p_empresa_id
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_current_empresa_id();
END;
$$;

ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can view their own company associations"
ON public.usuarios_empresas FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can insert their own company associations"
ON public.usuarios_empresas FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own company associations" ON public.usuarios_empresas;
CREATE POLICY "Users can update their own company associations"
ON public.usuarios_empresas FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid());

