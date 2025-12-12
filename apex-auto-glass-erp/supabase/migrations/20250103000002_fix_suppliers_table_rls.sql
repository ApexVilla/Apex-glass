-- ============================================
-- CORREÇÃO DA TABELA SUPPLIERS
-- Adiciona foreign key, RLS correto e índices
-- ============================================

-- Adicionar foreign key para company_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'suppliers_company_id_fkey'
    ) THEN
        ALTER TABLE public.suppliers
        ADD CONSTRAINT suppliers_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.suppliers;

-- Criar políticas RLS baseadas em company_id
CREATE POLICY "Users can view suppliers in their company"
  ON public.suppliers FOR SELECT
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can insert suppliers in their company"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can update suppliers in their company"
  ON public.suppliers FOR UPDATE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

CREATE POLICY "Users can delete suppliers in their company"
  ON public.suppliers FOR DELETE
  USING (
    company_id IS NULL OR 
    company_id = get_user_company_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.email = 'villarroelsamir85@gmail.com' OR profiles.email = 'samir@apexglass.com')
    )
  );

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_nome_razao ON public.suppliers(nome_razao);
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf_cnpj ON public.suppliers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_suppliers_ativo ON public.suppliers(ativo) WHERE ativo = true;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS handle_updated_at ON public.suppliers;

-- Criar trigger para updated_at usando função padrão
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

