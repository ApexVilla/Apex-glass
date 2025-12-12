-- ============================================
-- VERIFICAR: Dados misturados entre empresas
-- ============================================
-- Execute este script para verificar se há dados de empresas diferentes

-- 1. Listar todas as empresas
SELECT 
  id,
  name,
  cnpj,
  (SELECT COUNT(*) FROM public.profiles WHERE company_id = companies.id) as total_usuarios,
  (SELECT COUNT(*) FROM public.customers WHERE company_id = companies.id) as total_clientes,
  (SELECT COUNT(*) FROM public.sales WHERE company_id = companies.id) as total_vendas,
  (SELECT COUNT(*) FROM public.products WHERE company_id = companies.id) as total_produtos
FROM public.companies
ORDER BY name;

-- 2. Verificar vendas por empresa
SELECT 
  c.name as empresa,
  COUNT(s.id) as total_vendas,
  SUM(s.total) as valor_total
FROM public.companies c
LEFT JOIN public.sales s ON s.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. Verificar clientes por empresa
SELECT 
  c.name as empresa,
  COUNT(cust.id) as total_clientes
FROM public.companies c
LEFT JOIN public.customers cust ON cust.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 4. Verificar produtos por empresa
SELECT 
  c.name as empresa,
  COUNT(p.id) as total_produtos
FROM public.companies c
LEFT JOIN public.products p ON p.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 5. Verificar se há vendas sem company_id (problema!)
SELECT 
  'VENDAS SEM COMPANY_ID' as tipo,
  COUNT(*) as total
FROM public.sales
WHERE company_id IS NULL;

-- 6. Verificar se há clientes sem company_id (problema!)
SELECT 
  'CLIENTES SEM COMPANY_ID' as tipo,
  COUNT(*) as total
FROM public.customers
WHERE company_id IS NULL;

-- 7. Verificar se há produtos sem company_id (problema!)
SELECT 
  'PRODUTOS SEM COMPANY_ID' as tipo,
  COUNT(*) as total
FROM public.products
WHERE company_id IS NULL;

-- 8. Mostrar exemplos de vendas de cada empresa
SELECT 
  c.name as empresa,
  s.sale_number,
  s.total,
  s.created_at,
  cust.name as cliente
FROM public.sales s
JOIN public.companies c ON c.id = s.company_id
LEFT JOIN public.customers cust ON cust.id = s.customer_id
ORDER BY c.name, s.created_at DESC
LIMIT 20;

