-- ============================================
-- PARTE 4: REMOVER POLÍTICAS ANTIGAS
-- Execute esta parte após a PARTE 3
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can insert ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can delete ' || r.tablename || ' in their company', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can manage ' || r.tablename || ' in their company', r.tablename);
  END LOOP;
END $$;

