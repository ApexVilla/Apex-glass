-- ============================================
-- CORREÇÃO: Baixa de Estoque na Separação
-- ============================================
-- Objetivo: Garantir que o estoque seja baixado automaticamente
-- ao finalizar a separação de itens
-- ============================================

-- 1. Corrigir função create_inventory_movement para que saida_separacao baixe estoque
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_movement_id UUID;
    v_current_quantity INTEGER;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_valid_types TEXT[] := ARRAY[
        'in', 'out',
        'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
        'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente',
        'saida_venda', 'saida_manual', 'saida_separacao', 
        'saida_ajuste', 'saida_devolucao_cliente',
        'transferencia'
    ];
BEGIN
    -- Validar tipo de movimentação
    IF NOT (p_type = ANY(v_valid_types)) THEN
        RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_type
            USING HINT = 'Tipos válidos: ' || array_to_string(v_valid_types, ', ');
    END IF;
    
    -- Verificar se produto existe
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND company_id = p_company_id) THEN
        RAISE EXCEPTION 'Produto não encontrado ou não pertence à empresa';
    END IF;
    
    -- Verificar estoque disponível para saídas
    IF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        SELECT COALESCE(quantity, 0) INTO v_current_quantity
        FROM public.products
        WHERE id = p_product_id AND company_id = p_company_id;
        
        IF v_current_quantity < p_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_current_quantity, p_quantity;
        END IF;
    END IF;
    
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
    -- CORREÇÃO: saida_separacao AGORA baixa estoque automaticamente
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                  'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        v_balance_after := v_balance_before + p_quantity;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        -- Todos os tipos de saída baixam estoque, incluindo saida_separacao
        v_balance_after := v_balance_before - p_quantity;
    ELSIF p_type = 'transferencia' THEN
        -- Transferência não altera o saldo total (entrada em um lugar = saída em outro)
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
    -- CORREÇÃO: saida_separacao AGORA baixa estoque automaticamente
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                  'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        UPDATE public.products
        SET quantity = quantity + p_quantity
        WHERE id = p_product_id AND company_id = p_company_id;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        -- Todos os tipos de saída baixam estoque, incluindo saida_separacao
        UPDATE public.products
        SET quantity = GREATEST(0, quantity - p_quantity)
        WHERE id = p_product_id AND company_id = p_company_id;
    -- transferencia não altera estoque total
    END IF;
    
    RETURN v_movement_id;
END;
$$;

-- 2. Atualizar função calculate_stock_balance_before para incluir saida_separacao
CREATE OR REPLACE FUNCTION public.calculate_stock_balance_before(
    p_product_id UUID,
    p_company_id UUID,
    p_movement_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Get current product quantity
    SELECT COALESCE(quantity, 0) INTO v_balance
    FROM public.products
    WHERE id = p_product_id AND company_id = p_company_id;
    
    -- Subtract all movements after this date
    -- CORREÇÃO: saida_separacao AGORA é considerada no cálculo (baixa estoque)
    SELECT v_balance - COALESCE(SUM(
        CASE 
            WHEN type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                         'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN quantity
            WHEN type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN -quantity
            -- transferencia não altera saldo total
            ELSE 0
        END
    ), 0) INTO v_balance
    FROM public.inventory_movements
    WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND created_at > p_movement_date
    AND type != 'transferencia'; -- Excluir transferencia do cálculo
    
    RETURN COALESCE(v_balance, 0);
END;
$$;

-- 3. Atualizar função update_movement_balances para incluir saida_separacao
CREATE OR REPLACE FUNCTION public.update_movement_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- CORREÇÃO: saida_separacao AGORA altera o saldo (baixa estoque)
    IF NEW.type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                    'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        v_balance_after := v_balance_before + NEW.quantity;
    ELSIF NEW.type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        -- Todos os tipos de saída alteram o saldo, incluindo saida_separacao
        v_balance_after := v_balance_before - NEW.quantity;
    ELSIF NEW.type = 'transferencia' THEN
        -- transferencia não altera o saldo total
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

-- Comentário na função
COMMENT ON FUNCTION public.create_inventory_movement IS 'Cria uma movimentação de estoque. CORRIGIDO: saida_separacao agora baixa estoque automaticamente ao finalizar separação.';

