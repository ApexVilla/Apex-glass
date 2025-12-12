-- ============================================
-- INVESTIGAR VENDA #18 E PROBLEMA DE SEQUÊNCIAS
-- ============================================

-- 1. VERIFICAR VENDA #18
SELECT 
  s.id,
  s.sale_number,
  s.company_id,
  c.name as empresa,
  s.customer_id,
  cust.name as cliente,
  s.total,
  s.payment_status,
  s.created_at
FROM public.sales s
LEFT JOIN public.companies c ON s.company_id = c.id
LEFT JOIN public.customers cust ON s.customer_id = cust.id
WHERE s.sale_number = 18
ORDER BY s.created_at DESC;

-- 2. VERIFICAR TODAS AS VENDAS POR EMPRESA
SELECT 
  c.name as empresa,
  COUNT(*) as total_vendas,
  MIN(s.sale_number) as primeira_venda,
  MAX(s.sale_number) as ultima_venda,
  ARRAY_AGG(DISTINCT s.sale_number ORDER BY s.sale_number) as numeros_vendas
FROM public.sales s
LEFT JOIN public.companies c ON s.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. VERIFICAR SE HÁ VENDAS COM MESMO NÚMERO EM EMPRESAS DIFERENTES
SELECT 
  s.sale_number,
  COUNT(*) as quantidade,
  ARRAY_AGG(c.name) as empresas,
  ARRAY_AGG(s.id) as ids_vendas
FROM public.sales s
LEFT JOIN public.companies c ON s.company_id = c.id
GROUP BY s.sale_number
HAVING COUNT(*) > 1
ORDER BY s.sale_number;

-- 4. VERIFICAR PEDIDOS POR EMPRESA
SELECT 
  c.name as empresa,
  COUNT(*) as total_pedidos,
  MIN(so.order_number) as primeiro_pedido,
  MAX(so.order_number) as ultimo_pedido,
  ARRAY_AGG(DISTINCT so.order_number ORDER BY so.order_number) as numeros_pedidos
FROM public.service_orders so
LEFT JOIN public.companies c ON so.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 5. VERIFICAR SE HÁ PEDIDOS COM MESMO NÚMERO EM EMPRESAS DIFERENTES
SELECT 
  so.order_number,
  COUNT(*) as quantidade,
  ARRAY_AGG(c.name) as empresas,
  ARRAY_AGG(so.id) as ids_pedidos
FROM public.service_orders so
LEFT JOIN public.companies c ON so.company_id = c.id
GROUP BY so.order_number
HAVING COUNT(*) > 1
ORDER BY so.order_number;

-- 6. VERIFICAR NOTAS FISCAIS POR EMPRESA (se a tabela existir)
-- Execute esta query apenas se a tabela invoices existir
-- SELECT 
--   c.name as empresa,
--   COUNT(*) as total_notas,
--   MIN(i.invoice_number) as primeira_nota,
--   MAX(i.invoice_number) as ultima_nota
-- FROM public.invoices i
-- LEFT JOIN public.companies c ON i.company_id = c.id
-- GROUP BY c.id, c.name
-- ORDER BY c.name;

-- 7. LISTAR TODAS AS EMPRESAS
SELECT 
  id,
  name,
  cnpj,
  (SELECT COUNT(*) FROM public.sales WHERE company_id = companies.id) as total_vendas,
  (SELECT COUNT(*) FROM public.service_orders WHERE company_id = companies.id) as total_pedidos
FROM public.companies
ORDER BY name;

