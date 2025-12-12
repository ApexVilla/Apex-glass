-- ============================================
-- CORREÇÃO URGENTE: Criar coluna e corrigir RLS
-- ============================================
-- Execute este script PRIMEIRO para resolver os erros

-- 1. CRIAR COLUNA credit_status (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    -- Criar a coluna
    ALTER TABLE public.sales
    ADD COLUMN credit_status TEXT;
    
    -- Definir valor padrão para registros existentes
    UPDATE public.sales
    SET credit_status = 'pending'
    WHERE credit_status IS NULL;
    
    -- Adicionar valor padrão
    ALTER TABLE public.sales
    ALTER COLUMN credit_status SET DEFAULT 'pending';
    
    -- Adicionar constraint (remover se existir primeiro)
    ALTER TABLE public.sales
    DROP CONSTRAINT IF EXISTS sales_credit_status_check;
    
    ALTER TABLE public.sales
    ADD CONSTRAINT sales_credit_status_check 
    CHECK (credit_status IN ('pending', 'approved', 'denied'));
    
    RAISE NOTICE '✅ Coluna credit_status criada!';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna credit_status já existe';
  END IF;
END $$;

-- 2. VERIFICAR E CORRIGIR POLÍTICAS RLS DA TABELA SALES
-- O problema é que a política precisa ter WITH CHECK para INSERT funcionar
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- Criar política única que funciona para todas as operações (mais simples e eficiente)
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- 3. VERIFICAR SE FUNÇÃO get_user_company_id EXISTE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_company_id'
  ) THEN
    RAISE NOTICE '⚠️  Função get_user_company_id não existe!';
    RAISE NOTICE 'Criando função get_user_company_id...';
    
    -- Criar função básica se não existir
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    AS $$
    DECLARE
      v_company_id uuid;
    BEGIN
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = auth.uid();
      
      RETURN v_company_id;
    END;
    $$;
    
    RAISE NOTICE '✅ Função get_user_company_id criada!';
  ELSE
    RAISE NOTICE '✅ Função get_user_company_id existe';
  END IF;
END $$;

-- 4. VERIFICAR RESULTADO
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sales' 
      AND column_name = 'credit_status'
  ) THEN
    RAISE NOTICE '✅✅✅ SUCESSO: Coluna credit_status criada e RLS corrigido!';
  ELSE
    RAISE NOTICE '❌ ERRO: Coluna credit_status não foi criada';
  END IF;
END $$;

-- 5. Mostrar políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY policyname;

