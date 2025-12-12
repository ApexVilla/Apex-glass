-- ============================================
-- CORREÇÃO URGENTE: Baixa de Estoque Após Separação
-- ============================================
-- Este script corrige o problema onde o estoque não está sendo baixado
-- após a separação quando não há permissão de conferência
--
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Atualizar função create_inventory_movement para garantir que saida_venda baixa estoque
CREATE OR REPLACE FUNCTION public.create_inventory_movement(
    p_company_id UUID,
    p_product_id UUID,
    p_type TEXT,
    p_quantity INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_custo_unitario DECIMAL(12,2) DEFAULT NULL,
    p_deposito TEXT DEFAULT 'principal',
    p_lote TEXT DEFAULT NULL,
    p_validade DATE DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_movement_id UUID;
    v_current_quantity INTEGER;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get current product quantity
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM public.products
    WHERE id = p_product_id AND company_id = p_company_id;
    
    -- Calculate balance before this movement
    v_balance_before := public.calculate_stock_balance_before(
        p_product_id,
        p_company_id,
        now()
    );
    
    -- Calculate balance after this movement
    -- IMPORTANTE: saida_separacao NÃO deve alterar o saldo (não baixa estoque)
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_fornecedor') THEN
        v_balance_after := v_balance_before + p_quantity;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        -- Tipos que baixam estoque imediatamente
        v_balance_after := v_balance_before - p_quantity;
    ELSIF p_type = 'saida_separacao' THEN
        -- saida_separacao NÃO baixa estoque, apenas registra a movimentação
        -- O estoque será baixado quando a conferência aprovar (criando saida_venda)
        v_balance_after := v_balance_before;
    ELSE
        v_balance_after := v_balance_before;
    END IF;
    
    -- Get cost from product if not provided
    IF p_custo_unitario IS NULL OR p_custo_unitario = 0 THEN
        SELECT COALESCE(purchase_price, 0) INTO p_custo_unitario
        FROM public.products
        WHERE id = p_product_id;
    END IF;
    
    -- Insert movement
    INSERT INTO public.inventory_movements (
        company_id,
        product_id,
        type,
        quantity,
        reason,
        reference_id,
        reference_type,
        user_id,
        saldo_anterior,
        saldo_atual,
        custo_unitario,
        deposito,
        lote,
        validade,
        observacoes
    ) VALUES (
        p_company_id,
        p_product_id,
        p_type,
        p_quantity,
        p_reason,
        p_reference_id,
        p_reference_type,
        p_user_id,
        v_balance_before,
        v_balance_after,
        p_custo_unitario,
        p_deposito,
        p_lote,
        p_validade,
        p_observacoes
    )
    RETURNING id INTO v_movement_id;
    
    -- Update product quantity
    -- IMPORTANTE: saida_separacao NÃO deve baixar estoque
    -- IMPORTANTE: saida_venda DEVE baixar estoque imediatamente
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_fornecedor') THEN
        UPDATE public.products
        SET quantity = quantity + p_quantity
        WHERE id = p_product_id AND company_id = p_company_id;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        -- Tipos que baixam estoque imediatamente
        UPDATE public.products
        SET quantity = GREATEST(0, quantity - p_quantity)
        WHERE id = p_product_id AND company_id = p_company_id;
    -- saida_separacao não faz nada aqui - não baixa estoque
    END IF;
    
    RETURN v_movement_id;
END;
$$;

-- 2. Atualizar função calculate_stock_balance_before
CREATE OR REPLACE FUNCTION public.calculate_stock_balance_before(
    p_product_id UUID,
    p_company_id UUID,
    p_movement_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Get current product quantity
    SELECT COALESCE(quantity, 0) INTO v_balance
    FROM public.products
    WHERE id = p_product_id AND company_id = p_company_id;
    
    -- Subtract all movements after this date
    -- IMPORTANTE: saida_separacao NÃO deve ser considerada (não baixa estoque)
    SELECT v_balance - COALESCE(SUM(
        CASE 
            WHEN type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_devolucao_fornecedor') THEN quantity
            WHEN type IN ('out', 'saida_venda', 'saida_manual', 'saida_devolucao_cliente') THEN -quantity
            -- saida_separacao não é considerada aqui
            ELSE 0
        END
    ), 0) INTO v_balance
    FROM public.inventory_movements
    WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND created_at > p_movement_date
    AND type != 'saida_separacao'; -- Excluir saida_separacao do cálculo
    
    RETURN COALESCE(v_balance, 0);
END;
$$;

-- 3. Atualizar função update_movement_balances
CREATE OR REPLACE FUNCTION public.update_movement_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Get current product quantity
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM public.products
    WHERE id = NEW.product_id AND company_id = NEW.company_id;
    
    -- Calculate balance before this movement
    v_balance_before := public.calculate_stock_balance_before(
        NEW.product_id,
        NEW.company_id,
        NEW.created_at
    );
    
    -- Calculate balance after this movement
    -- IMPORTANTE: saida_separacao NÃO altera o saldo
    IF NEW.type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_devolucao_fornecedor') THEN
        v_balance_after := v_balance_before + NEW.quantity;
    ELSIF NEW.type IN ('out', 'saida_venda', 'saida_manual', 'saida_devolucao_cliente') THEN
        v_balance_after := v_balance_before - NEW.quantity;
    ELSIF NEW.type = 'saida_separacao' THEN
        -- saida_separacao não altera o saldo
        v_balance_after := v_balance_before;
    ELSE
        v_balance_after := v_balance_before;
    END IF;
    
    -- Set balances
    NEW.saldo_anterior := v_balance_before;
    NEW.saldo_atual := v_balance_after;
    
    -- Get cost from product if not provided
    IF NEW.custo_unitario IS NULL OR NEW.custo_unitario = 0 THEN
        SELECT COALESCE(purchase_price, 0) INTO NEW.custo_unitario
        FROM public.products
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute estas queries para verificar se a correção foi aplicada:

-- Verificar se a função foi atualizada:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'create_inventory_movement';

-- Verificar movimentações recentes:
-- SELECT type, quantity, reason, created_at 
-- FROM inventory_movements 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ============================================
-- FIM DO SCRIPT
-- ============================================





