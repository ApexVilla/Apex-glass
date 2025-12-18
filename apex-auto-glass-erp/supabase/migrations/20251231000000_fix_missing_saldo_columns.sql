-- ============================================
-- CORREÇÃO: Colunas saldo_anterior e saldo_atual ausentes
-- ============================================
-- Esta migração garante que as colunas necessárias existam
-- antes que a função create_inventory_movement tente usá-las
-- ============================================

-- Adicionar colunas se não existirem
ALTER TABLE public.inventory_movements
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS saldo_anterior INTEGER,
ADD COLUMN IF NOT EXISTS saldo_atual INTEGER,
ADD COLUMN IF NOT EXISTS custo_unitario DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS deposito TEXT DEFAULT 'principal',
ADD COLUMN IF NOT EXISTS lote TEXT,
ADD COLUMN IF NOT EXISTS validade DATE,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_type ON public.inventory_movements(reference_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(type);

-- Garantir que a função calculate_stock_balance_before existe
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
    SELECT v_balance - COALESCE(SUM(
        CASE 
            WHEN type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                         'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN quantity
            WHEN type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN -quantity
            ELSE 0
        END
    ), 0) INTO v_balance
    FROM public.inventory_movements
    WHERE product_id = p_product_id
    AND company_id = p_company_id
    AND created_at > p_movement_date;
    
    RETURN COALESCE(v_balance, 0);
END;
$$;

-- Atualizar função create_inventory_movement para garantir compatibilidade
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
    -- IMPORTANTE: saida_separacao agora baixa estoque automaticamente
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                  'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        v_balance_after := v_balance_before + p_quantity;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        v_balance_after := v_balance_before - p_quantity;
    ELSIF p_type = 'transferencia' THEN
        -- Transferência não altera o saldo total
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
    
    -- Insert movement com todas as colunas (agora garantidas que existem)
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
    -- IMPORTANTE: saida_separacao agora baixa estoque automaticamente
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                  'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        UPDATE public.products
        SET quantity = quantity + p_quantity
        WHERE id = p_product_id AND company_id = p_company_id;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        UPDATE public.products
        SET quantity = GREATEST(0, quantity - p_quantity)
        WHERE id = p_product_id AND company_id = p_company_id;
    -- transferencia não altera estoque
    END IF;
    
    RETURN v_movement_id;
END;
$$;

-- Criar trigger para atualizar saldos automaticamente (se as colunas existirem)
DROP TRIGGER IF EXISTS trigger_update_movement_balances ON public.inventory_movements;

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
    IF NEW.type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 
                    'entrada_devolucao_fornecedor', 'entrada_devolucao_cliente') THEN
        v_balance_after := v_balance_before + NEW.quantity;
    ELSIF NEW.type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        v_balance_after := v_balance_before - NEW.quantity;
    ELSIF NEW.type = 'transferencia' THEN
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

CREATE TRIGGER trigger_update_movement_balances
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_movement_balances();

-- Comentário na função
COMMENT ON FUNCTION public.create_inventory_movement IS 'Cria uma movimentação de estoque e atualiza o estoque automaticamente. IMPORTANTE: Esta função já atualiza o estoque, incluindo saida_separacao que agora baixa estoque automaticamente.';



