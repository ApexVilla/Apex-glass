-- ============================================
-- CORREÇÃO: Dupla Decrementação de Estoque
-- ============================================
-- Esta migração remove o trigger que estava causando
-- dupla decrementação do estoque quando uma venda é criada.
-- A função create_inventory_movement já atualiza o estoque,
-- então o trigger estava duplicando essa atualização.
-- ============================================

-- Remover o trigger que atualiza estoque automaticamente ao inserir movimentação
-- A função create_inventory_movement já faz isso, então o trigger causa dupla decrementação
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement_insert ON public.inventory_movements;

-- Remover a função também, já que não será mais usada
DROP FUNCTION IF EXISTS public.update_stock_on_movement_insert();

-- Comentário explicativo
COMMENT ON FUNCTION public.create_inventory_movement IS 'Cria uma movimentação de estoque e atualiza o estoque automaticamente. IMPORTANTE: Esta função já atualiza o estoque, não use triggers adicionais que também atualizem o estoque para evitar dupla decrementação.';

