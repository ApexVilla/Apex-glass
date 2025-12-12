-- Expand inventory_movements table for comprehensive stock movement report

-- Add new columns to inventory_movements
ALTER TABLE public.inventory_movements
ADD COLUMN IF NOT EXISTS reference_type TEXT, -- 'sale', 'picking', 'nf_entrada', 'nf_saida', 'ajuste', 'transferencia', 'devolucao_cliente', 'devolucao_fornecedor'
ADD COLUMN IF NOT EXISTS saldo_anterior INTEGER,
ADD COLUMN IF NOT EXISTS saldo_atual INTEGER,
ADD COLUMN IF NOT EXISTS custo_unitario DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS deposito TEXT DEFAULT 'principal',
ADD COLUMN IF NOT EXISTS lote TEXT,
ADD COLUMN IF NOT EXISTS validade DATE,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_type ON public.inventory_movements(reference_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(type);

-- Create function to calculate stock balance before movement
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
    SELECT v_balance - COALESCE(SUM(
        CASE 
            WHEN type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_devolucao_fornecedor') THEN quantity
            WHEN type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_devolucao_cliente') THEN -quantity
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

-- Create function to update saldo_anterior and saldo_atual when inserting movement
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
    IF NEW.type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_devolucao_fornecedor') THEN
        v_balance_after := v_balance_before + NEW.quantity;
    ELSIF NEW.type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_devolucao_cliente') THEN
        v_balance_after := v_balance_before - NEW.quantity;
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

-- Create trigger to auto-calculate balances
DROP TRIGGER IF EXISTS trigger_update_movement_balances ON public.inventory_movements;
CREATE TRIGGER trigger_update_movement_balances
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_movement_balances();

-- Update existing movements to have reference_type based on reason
UPDATE public.inventory_movements
SET reference_type = CASE
    WHEN reason ILIKE '%venda%' OR reason ILIKE '%sale%' THEN 'sale'
    WHEN reason ILIKE '%separação%' OR reason ILIKE '%picking%' THEN 'picking'
    WHEN reason ILIKE '%NF Entrada%' OR reason ILIKE '%nf entrada%' THEN 'nf_entrada'
    WHEN reason ILIKE '%NF Saída%' OR reason ILIKE '%nf saída%' THEN 'nf_saida'
    WHEN reason ILIKE '%ajuste%' THEN 'ajuste'
    WHEN reason ILIKE '%transferência%' OR reason ILIKE '%transferencia%' THEN 'transferencia'
    WHEN reason ILIKE '%devolução%' OR reason ILIKE '%devolucao%' THEN 
        CASE 
            WHEN reason ILIKE '%cliente%' THEN 'devolucao_cliente'
            WHEN reason ILIKE '%fornecedor%' THEN 'devolucao_fornecedor'
            ELSE 'devolucao_cliente'
        END
    ELSE 'manual'
END
WHERE reference_type IS NULL;

-- Update type values to be more descriptive
UPDATE public.inventory_movements
SET type = CASE
    WHEN type = 'in' AND reference_type = 'nf_entrada' THEN 'entrada_compra'
    WHEN type = 'in' AND reference_type = 'ajuste' THEN 'entrada_ajuste'
    WHEN type = 'in' AND reference_type = 'devolucao_fornecedor' THEN 'entrada_devolucao_fornecedor'
    WHEN type = 'in' THEN 'entrada_manual'
    WHEN type = 'out' AND reference_type = 'sale' THEN 'saida_venda'
    WHEN type = 'out' AND reference_type = 'picking' THEN 'saida_separacao'
    WHEN type = 'out' AND reference_type = 'ajuste' THEN 'saida_ajuste'
    WHEN type = 'out' AND reference_type = 'devolucao_cliente' THEN 'saida_devolucao_cliente'
    WHEN type = 'out' THEN 'saida_manual'
    ELSE type
END
WHERE type IN ('in', 'out');

-- Create or replace function to create inventory movement with all fields
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
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_fornecedor') THEN
        v_balance_after := v_balance_before + p_quantity;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        v_balance_after := v_balance_before - p_quantity;
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
    IF p_type IN ('in', 'entrada_compra', 'entrada_manual', 'entrada_ajuste', 'entrada_devolucao_fornecedor') THEN
        UPDATE public.products
        SET quantity = quantity + p_quantity
        WHERE id = p_product_id AND company_id = p_company_id;
    ELSIF p_type IN ('out', 'saida_venda', 'saida_manual', 'saida_separacao', 'saida_ajuste', 'saida_devolucao_cliente') THEN
        UPDATE public.products
        SET quantity = GREATEST(0, quantity - p_quantity)
        WHERE id = p_product_id AND company_id = p_company_id;
    END IF;
    
    RETURN v_movement_id;
END;
$$;

