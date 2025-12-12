-- ============================================
-- VERIFICAR VENDAS POR EMPRESA
-- Execute esta query no Supabase SQL Editor
-- ============================================

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






