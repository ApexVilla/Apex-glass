-- ============================================
-- INVESTIGAR VENDA #18 - VERSÃO SIMPLES
-- Execute cada query separadamente no Supabase SQL Editor
-- ============================================

-- QUERY 1: Verificar venda #18
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






