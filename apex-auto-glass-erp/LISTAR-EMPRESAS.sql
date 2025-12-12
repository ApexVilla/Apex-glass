-- ============================================
-- LISTAR TODAS AS EMPRESAS
-- Execute esta query no Supabase SQL Editor
-- ============================================

SELECT 
  id,
  name,
  cnpj,
  (SELECT COUNT(*) FROM public.sales WHERE company_id = companies.id) as total_vendas,
  (SELECT COUNT(*) FROM public.service_orders WHERE company_id = companies.id) as total_pedidos
FROM public.companies
ORDER BY name;






