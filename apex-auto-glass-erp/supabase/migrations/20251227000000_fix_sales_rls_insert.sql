-- 🔧 CORREÇÃO: Adicionar WITH CHECK para permitir INSERT na tabela sales
-- O problema era que a política RLS tinha apenas USING, que funciona para SELECT/UPDATE/DELETE
-- mas para INSERT é necessário WITH CHECK

-- Remove a política existente
DROP POLICY IF EXISTS "Users can manage sales in their company" ON public.sales;

-- Recria a política com USING e WITH CHECK
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id())
WITH CHECK (company_id = public.get_user_company_id());

-- Também corrige a política de sale_items para garantir que funciona corretamente
DROP POLICY IF EXISTS "Users can manage sale items" ON public.sale_items;

CREATE POLICY "Users can manage sale items"
ON public.sale_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = public.get_user_company_id()
  )
);

