-- ============================================
-- CORRIGIR: Isolamento de dados entre empresas
-- ============================================
-- Este script garante que cada empresa veja apenas seus dados

-- 1. VERIFICAR E CORRIGIR POLÍTICAS RLS DE TODAS AS TABELAS PRINCIPAIS

-- ============================================
-- TABELA: customers
-- ============================================
DROP POLICY IF EXISTS "Users can view customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers in their company" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers in their company" ON public.customers;

CREATE POLICY "Users can view customers in their company"
ON public.customers FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert customers in their company"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update customers in their company"
ON public.customers FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete customers in their company"
ON public.customers FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- TABELA: products
-- ============================================
DROP POLICY IF EXISTS "Users can manage products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can view products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can insert products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can update products in their company" ON public.products;
DROP POLICY IF EXISTS "Users can delete products in their company" ON public.products;

CREATE POLICY "Users can view products in their company"
ON public.products FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert products in their company"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update products in their company"
ON public.products FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete products in their company"
ON public.products FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- TABELA: sales
-- ============================================
DROP POLICY IF EXISTS "Users can view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public.sales;
DROP POLICY IF EXISTS "Allow users to view sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to update sales in their company" ON public.sales;
DROP POLICY IF EXISTS "Allow users to delete sales in their company" ON public.sales;

CREATE POLICY "Users can view sales in their company"
ON public.sales FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert sales in their company"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update sales in their company"
ON public.sales FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete sales in their company"
ON public.sales FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- TABELA: sale_items
-- ============================================
DROP POLICY IF EXISTS "Users can manage sale items" ON public.sale_items;

CREATE POLICY "Users can manage sale items"
ON public.sale_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_items.sale_id 
    AND s.company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_items.sale_id 
    AND s.company_id = public.get_user_company_id()
  )
);

-- ============================================
-- TABELA: service_orders
-- ============================================
DROP POLICY IF EXISTS "Users can manage service orders in their company" ON public.service_orders;

CREATE POLICY "Users can view service orders in their company"
ON public.service_orders FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert service orders in their company"
ON public.service_orders FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update service orders in their company"
ON public.service_orders FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete service orders in their company"
ON public.service_orders FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- TABELA: inventory_movements
-- ============================================
DROP POLICY IF EXISTS "Users can manage inventory in their company" ON public.inventory_movements;

CREATE POLICY "Users can view inventory in their company"
ON public.inventory_movements FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert inventory in their company"
ON public.inventory_movements FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update inventory in their company"
ON public.inventory_movements FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete inventory in their company"
ON public.inventory_movements FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- TABELA: customer_vehicles
-- ============================================
DROP POLICY IF EXISTS "Users can manage vehicles in their company" ON public.customer_vehicles;

CREATE POLICY "Users can view vehicles in their company"
ON public.customer_vehicles FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert vehicles in their company"
ON public.customer_vehicles FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update vehicles in their company"
ON public.customer_vehicles FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete vehicles in their company"
ON public.customer_vehicles FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- ============================================
-- VERIFICAR POLÍTICAS CRIADAS
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd IN ('INSERT', 'UPDATE') AND with_check IS NOT NULL THEN 'OK'
    WHEN cmd IN ('SELECT', 'DELETE') AND qual IS NOT NULL THEN 'OK'
    ELSE 'VERIFICAR'
  END as status
FROM pg_policies
WHERE tablename IN ('customers', 'products', 'sales', 'sale_items', 'service_orders', 'inventory_movements', 'customer_vehicles')
ORDER BY tablename, cmd;

-- ============================================
-- MENSAGEM FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLITICAS RLS CORRIGIDAS!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agora cada empresa so ve seus dados:';
  RAISE NOTICE '  - Clientes';
  RAISE NOTICE '  - Produtos';
  RAISE NOTICE '  - Vendas';
  RAISE NOTICE '  - Ordens de servico';
  RAISE NOTICE '  - Movimentacoes de estoque';
  RAISE NOTICE '  - Veiculos';
  RAISE NOTICE '';
  RAISE NOTICE 'Execute VERIFICAR-DADOS-MISTURADOS.sql';
  RAISE NOTICE 'para verificar se ha dados sem company_id';
  RAISE NOTICE '========================================';
END $$;

