-- ============================================
-- VERIFICAR VENDAS COM MESMO NÚMERO EM EMPRESAS DIFERENTES
-- Execute esta query no Supabase SQL Editor
-- ============================================

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






