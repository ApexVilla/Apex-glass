-- ============================================
-- SCRIPT PARA CORRIGIR ERROS NO SUPABASE
-- Copie TODO este conteúdo e cole no SQL Editor do Supabase
-- ============================================
-- 
-- Este script corrige dois problemas:
-- 1. Cria as funções de status de pendências (add_sale_status, etc.)
-- 2. Adiciona foreign key entre profiles e user_roles para permitir relacionamento
-- ============================================

-- ============================================
-- PARTE 1: SISTEMA DE STATUS DE PENDÊNCIAS
-- ============================================

-- 1. Adicionar coluna status_codes na tabela sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status_codes text[] DEFAULT '{}';

-- 2. Criar função para adicionar status
CREATE OR REPLACE FUNCTION public.add_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar código de status
  IF p_status_code NOT IN ('E', 'C', 'D') THEN
    RAISE EXCEPTION 'Código de status inválido. Use: E, C ou D';
  END IF;

  -- Adicionar status se ainda não existir
  UPDATE public.sales
  SET status_codes = array_append(
    COALESCE(status_codes, '{}'),
    p_status_code
  )
  WHERE id = p_sale_id
  AND NOT (p_status_code = ANY(COALESCE(status_codes, '{}')));
END;
$$;

-- 3. Criar função para remover status
CREATE OR REPLACE FUNCTION public.remove_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remover status do array
  UPDATE public.sales
  SET status_codes = array_remove(
    COALESCE(status_codes, '{}'),
    p_status_code
  )
  WHERE id = p_sale_id;
END;
$$;

-- 4. Criar função para verificar se pode faturar
CREATE OR REPLACE FUNCTION public.can_invoice_sale(
  p_sale_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_codes text[];
  v_status_venda text;
BEGIN
  -- Buscar status da venda
  SELECT COALESCE(status_codes, '{}'), COALESCE(status_venda, 'normal')
  INTO v_status_codes, v_status_venda
  FROM public.sales
  WHERE id = p_sale_id;

  -- Verificar se há pendências de separação ou conferência pelo status_venda
  IF v_status_venda IN ('aguardando_separacao', 'em_separacao', 'separado', 'conferencia_pendente') THEN
    RETURN false;
  END IF;

  -- Retornar true apenas se não houver status (array vazio)
  RETURN array_length(v_status_codes, 1) IS NULL;
END;
$$;

-- 5. Criar função para verificar se tem status específico
CREATE OR REPLACE FUNCTION public.has_sale_status(
  p_sale_id uuid,
  p_status_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_codes text[];
BEGIN
  -- Buscar status da venda
  SELECT COALESCE(status_codes, '{}')
  INTO v_status_codes
  FROM public.sales
  WHERE id = p_sale_id;

  -- Verificar se o status existe no array
  RETURN p_status_code = ANY(v_status_codes);
END;
$$;

-- 6. Criar trigger para garantir que status_codes nunca seja NULL
CREATE OR REPLACE FUNCTION public.ensure_status_codes_not_null()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status_codes IS NULL THEN
    NEW.status_codes := '{}';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_sales_status_codes_not_null ON public.sales;
CREATE TRIGGER ensure_sales_status_codes_not_null
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_status_codes_not_null();

-- 7. Comentários para documentação
COMMENT ON COLUMN public.sales.status_codes IS 'Array de códigos de status de pendências: E (Estoque), C (Crédito), D (Desconto)';
COMMENT ON FUNCTION public.add_sale_status IS 'Adiciona um código de status à venda se ainda não existir';
COMMENT ON FUNCTION public.remove_sale_status IS 'Remove um código de status da venda';
COMMENT ON FUNCTION public.can_invoice_sale IS 'Retorna true se a venda pode ser faturada (sem pendências)';
COMMENT ON FUNCTION public.has_sale_status IS 'Retorna true se a venda possui o status especificado';

-- ============================================
-- PARTE 2: CORRIGIR RELACIONAMENTO PROFILES E USER_ROLES
-- ============================================

-- Verificar e limpar dados inconsistentes antes de adicionar foreign key
-- Remover registros de user_roles que não têm profile correspondente
DELETE FROM public.user_roles
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Adicionar foreign key de user_roles.user_id para profiles.id
-- Isso permite que o Supabase faça o relacionamento automático nas queries
-- Primeiro, verificar se a constraint já existe
DO $$
BEGIN
  -- Verificar se a foreign key já existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_profiles_fkey'
    AND table_name = 'user_roles'
    AND table_schema = 'public'
  ) THEN
    -- Adicionar foreign key de user_roles.user_id para profiles.id
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_profiles_fkey
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key adicionada: user_roles.user_id -> profiles.id';
  ELSE
    RAISE NOTICE 'Foreign key já existe: user_roles.user_id -> profiles.id';
  END IF;
END $$;

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Verificar se as funções foram criadas
SELECT 
  '✅ Funções de status criadas' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('add_sale_status', 'remove_sale_status', 'can_invoice_sale', 'has_sale_status')
ORDER BY routine_name;

-- Verificar se a coluna status_codes existe
SELECT 
  '✅ Coluna status_codes verificada' as status,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sales'
AND column_name = 'status_codes';

-- Verificar se a foreign key foi criada
SELECT 
  '✅ Foreign key verificada' as status,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_roles'
  AND kcu.column_name = 'user_id'
  AND ccu.table_name = 'profiles';

-- Mensagem final
SELECT '✅ Script executado com sucesso! Todos os erros foram corrigidos.' as status;

