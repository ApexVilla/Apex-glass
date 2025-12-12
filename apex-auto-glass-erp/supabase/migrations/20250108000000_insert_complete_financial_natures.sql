-- ============================================
-- NATUREZAS FINANCEIRAS COMPLETAS
-- Receitas (Entradas) e Despesas (Saídas)
-- ============================================

-- Função para inserir naturezas financeiras para todas as empresas
DO $$
DECLARE
    company_record RECORD;
BEGIN
    -- Loop através de todas as empresas (ou usar company_id NULL se não houver tabela companies)
    -- Como não temos tabela companies, vamos inserir para company_id NULL ou usar uma abordagem diferente
    
    -- Para cada company_id único encontrado em outras tabelas
    FOR company_record IN 
        SELECT DISTINCT company_id 
        FROM (
            SELECT company_id FROM public.products WHERE company_id IS NOT NULL
            UNION
            SELECT company_id FROM public.sales WHERE company_id IS NOT NULL
            UNION
            SELECT company_id FROM public.invoice_headers WHERE company_id IS NOT NULL
        ) AS companies
    LOOP
        -- ============================================
        -- RECEITAS (ENTRADAS)
        -- ============================================
        
        -- 01 – Vendas
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'entrada', 'Venda de Produtos', 'Vendas', '1.01', true, false, true),
            (company_record.company_id, 'entrada', 'Venda de Serviços', 'Vendas', '1.02', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento de Orçamentos / OS', 'Vendas', '1.03', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento por PIX', 'Vendas', '1.04', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento em Dinheiro', 'Vendas', '1.05', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento no Cartão (Crédito)', 'Vendas', '1.06', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento no Cartão (Débito)', 'Vendas', '1.07', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento de Boleto', 'Vendas', '1.08', true, false, true),
            (company_record.company_id, 'entrada', 'Recebimento Antecipado', 'Vendas', '1.09', true, false, true),
            (company_record.company_id, 'entrada', 'Devolução de Compra (Retorno de valores)', 'Vendas', '1.10', true, false, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 02 – Receitas Financeiras
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'entrada', 'Juros Recebidos', 'Receitas Financeiras', '2.01', true, false, true),
            (company_record.company_id, 'entrada', 'Rendimentos Bancários', 'Receitas Financeiras', '2.02', true, false, true),
            (company_record.company_id, 'entrada', 'Cashback/Estorno Recebido', 'Receitas Financeiras', '2.03', true, false, true),
            (company_record.company_id, 'entrada', 'Diferença de Caixa Positiva', 'Receitas Financeiras', '2.04', true, false, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 03 – Outras Receitas
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'entrada', 'Venda de Ativos (equipamentos)', 'Outras Receitas', '3.01', true, false, true),
            (company_record.company_id, 'entrada', 'Receitas Diversas', 'Outras Receitas', '3.02', true, false, true),
            (company_record.company_id, 'entrada', 'Reembolsos Recebidos', 'Outras Receitas', '3.03', true, false, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- ============================================
        -- DESPESAS (SAÍDAS)
        -- ============================================
        
        -- 04 – Compras
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'Compra de Produtos para Revenda', 'Compras', '4.01', false, true, true),
            (company_record.company_id, 'saida', 'Compra de Materiais', 'Compras', '4.02', false, true, true),
            (company_record.company_id, 'saida', 'Compra de Insumos', 'Compras', '4.03', false, true, true),
            (company_record.company_id, 'saida', 'Devolução de Venda (saída de valores)', 'Compras', '4.04', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 05 – Despesas Operacionais
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'Aluguel', 'Despesas Operacionais', '5.01', false, true, true),
            (company_record.company_id, 'saida', 'Luz', 'Despesas Operacionais', '5.02', false, true, true),
            (company_record.company_id, 'saida', 'Água', 'Despesas Operacionais', '5.03', false, true, true),
            (company_record.company_id, 'saida', 'Internet', 'Despesas Operacionais', '5.04', false, true, true),
            (company_record.company_id, 'saida', 'Telefone', 'Despesas Operacionais', '5.05', false, true, true),
            (company_record.company_id, 'saida', 'Limpeza', 'Despesas Operacionais', '5.06', false, true, true),
            (company_record.company_id, 'saida', 'Manutenção', 'Despesas Operacionais', '5.07', false, true, true),
            (company_record.company_id, 'saida', 'Combustível', 'Despesas Operacionais', '5.08', false, true, true),
            (company_record.company_id, 'saida', 'Estacionamento', 'Despesas Operacionais', '5.09', false, true, true),
            (company_record.company_id, 'saida', 'Logística / Frete', 'Despesas Operacionais', '5.10', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 06 – Pessoal
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'Salários', 'Pessoal', '6.01', false, true, true),
            (company_record.company_id, 'saida', 'Comissões', 'Pessoal', '6.02', false, true, true),
            (company_record.company_id, 'saida', 'Benefícios', 'Pessoal', '6.03', false, true, true),
            (company_record.company_id, 'saida', 'Vale Transporte', 'Pessoal', '6.04', false, true, true),
            (company_record.company_id, 'saida', 'FGTS / INSS / Encargos', 'Pessoal', '6.05', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 07 – Despesas Administrativas
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'Material de Escritório', 'Despesas Administrativas', '7.01', false, true, true),
            (company_record.company_id, 'saida', 'Softwares / Serviços Online', 'Despesas Administrativas', '7.02', false, true, true),
            (company_record.company_id, 'saida', 'Ferramentas', 'Despesas Administrativas', '7.03', false, true, true),
            (company_record.company_id, 'saida', 'Assinaturas', 'Despesas Administrativas', '7.04', false, true, true),
            (company_record.company_id, 'saida', 'Honorários Contábeis', 'Despesas Administrativas', '7.05', false, true, true),
            (company_record.company_id, 'saida', 'Honorários Jurídicos', 'Despesas Administrativas', '7.06', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 08 – Despesas Financeiras
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'Tarifas Bancárias', 'Despesas Financeiras', '8.01', false, true, true),
            (company_record.company_id, 'saida', 'Juros Pagos', 'Despesas Financeiras', '8.02', false, true, true),
            (company_record.company_id, 'saida', 'Multas', 'Despesas Financeiras', '8.03', false, true, true),
            (company_record.company_id, 'saida', 'Taxas de Cartão (Maquininha)', 'Despesas Financeiras', '8.04', false, true, true),
            (company_record.company_id, 'saida', 'Tarifa de PIX', 'Despesas Financeiras', '8.05', false, true, true),
            (company_record.company_id, 'saida', 'TED/DOC', 'Despesas Financeiras', '8.06', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 09 – Impostos
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'saida', 'ISS', 'Impostos', '9.01', false, true, true),
            (company_record.company_id, 'saida', 'ICMS', 'Impostos', '9.02', false, true, true),
            (company_record.company_id, 'saida', 'PIS', 'Impostos', '9.03', false, true, true),
            (company_record.company_id, 'saida', 'COFINS', 'Impostos', '9.04', false, true, true),
            (company_record.company_id, 'saida', 'Simples Nacional', 'Impostos', '9.05', false, true, true),
            (company_record.company_id, 'saida', 'Retenções', 'Impostos', '9.06', false, true, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
        -- 10 – Transferências / Bancário
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (company_record.company_id, 'ambos', 'Transferência entre Contas', 'Transferências / Bancário', '10.01', true, true, true),
            (company_record.company_id, 'saida', 'Saque', 'Transferências / Bancário', '10.02', false, true, true),
            (company_record.company_id, 'entrada', 'Depósito', 'Transferências / Bancário', '10.03', true, false, true),
            (company_record.company_id, 'saida', 'Aplicação Financeira', 'Transferências / Bancário', '10.04', false, true, true),
            (company_record.company_id, 'entrada', 'Resgate de Aplicação', 'Transferências / Bancário', '10.05', true, false, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
        
    END LOOP;
    
    -- Se não houver empresas, inserir com company_id NULL (para casos onde não há separação por empresa)
    IF NOT FOUND THEN
        -- Inserir naturezas com company_id NULL
        -- 01 – Vendas
        INSERT INTO public.financial_natures (company_id, type, name, category, code, appears_in_receivables, appears_in_payables, is_active)
        VALUES 
            (NULL, 'entrada', 'Venda de Produtos', 'Vendas', '1.01', true, false, true),
            (NULL, 'entrada', 'Venda de Serviços', 'Vendas', '1.02', true, false, true),
            (NULL, 'entrada', 'Recebimento de Orçamentos / OS', 'Vendas', '1.03', true, false, true),
            (NULL, 'entrada', 'Recebimento por PIX', 'Vendas', '1.04', true, false, true),
            (NULL, 'entrada', 'Recebimento em Dinheiro', 'Vendas', '1.05', true, false, true),
            (NULL, 'entrada', 'Recebimento no Cartão (Crédito)', 'Vendas', '1.06', true, false, true),
            (NULL, 'entrada', 'Recebimento no Cartão (Débito)', 'Vendas', '1.07', true, false, true),
            (NULL, 'entrada', 'Recebimento de Boleto', 'Vendas', '1.08', true, false, true),
            (NULL, 'entrada', 'Recebimento Antecipado', 'Vendas', '1.09', true, false, true),
            (NULL, 'entrada', 'Devolução de Compra (Retorno de valores)', 'Vendas', '1.10', true, false, true),
            -- 02 – Receitas Financeiras
            (NULL, 'entrada', 'Juros Recebidos', 'Receitas Financeiras', '2.01', true, false, true),
            (NULL, 'entrada', 'Rendimentos Bancários', 'Receitas Financeiras', '2.02', true, false, true),
            (NULL, 'entrada', 'Cashback/Estorno Recebido', 'Receitas Financeiras', '2.03', true, false, true),
            (NULL, 'entrada', 'Diferença de Caixa Positiva', 'Receitas Financeiras', '2.04', true, false, true),
            -- 03 – Outras Receitas
            (NULL, 'entrada', 'Venda de Ativos (equipamentos)', 'Outras Receitas', '3.01', true, false, true),
            (NULL, 'entrada', 'Receitas Diversas', 'Outras Receitas', '3.02', true, false, true),
            (NULL, 'entrada', 'Reembolsos Recebidos', 'Outras Receitas', '3.03', true, false, true),
            -- 04 – Compras
            (NULL, 'saida', 'Compra de Produtos para Revenda', 'Compras', '4.01', false, true, true),
            (NULL, 'saida', 'Compra de Materiais', 'Compras', '4.02', false, true, true),
            (NULL, 'saida', 'Compra de Insumos', 'Compras', '4.03', false, true, true),
            (NULL, 'saida', 'Devolução de Venda (saída de valores)', 'Compras', '4.04', false, true, true),
            -- 05 – Despesas Operacionais
            (NULL, 'saida', 'Aluguel', 'Despesas Operacionais', '5.01', false, true, true),
            (NULL, 'saida', 'Luz', 'Despesas Operacionais', '5.02', false, true, true),
            (NULL, 'saida', 'Água', 'Despesas Operacionais', '5.03', false, true, true),
            (NULL, 'saida', 'Internet', 'Despesas Operacionais', '5.04', false, true, true),
            (NULL, 'saida', 'Telefone', 'Despesas Operacionais', '5.05', false, true, true),
            (NULL, 'saida', 'Limpeza', 'Despesas Operacionais', '5.06', false, true, true),
            (NULL, 'saida', 'Manutenção', 'Despesas Operacionais', '5.07', false, true, true),
            (NULL, 'saida', 'Combustível', 'Despesas Operacionais', '5.08', false, true, true),
            (NULL, 'saida', 'Estacionamento', 'Despesas Operacionais', '5.09', false, true, true),
            (NULL, 'saida', 'Logística / Frete', 'Despesas Operacionais', '5.10', false, true, true),
            -- 06 – Pessoal
            (NULL, 'saida', 'Salários', 'Pessoal', '6.01', false, true, true),
            (NULL, 'saida', 'Comissões', 'Pessoal', '6.02', false, true, true),
            (NULL, 'saida', 'Benefícios', 'Pessoal', '6.03', false, true, true),
            (NULL, 'saida', 'Vale Transporte', 'Pessoal', '6.04', false, true, true),
            (NULL, 'saida', 'FGTS / INSS / Encargos', 'Pessoal', '6.05', false, true, true),
            -- 07 – Despesas Administrativas
            (NULL, 'saida', 'Material de Escritório', 'Despesas Administrativas', '7.01', false, true, true),
            (NULL, 'saida', 'Softwares / Serviços Online', 'Despesas Administrativas', '7.02', false, true, true),
            (NULL, 'saida', 'Ferramentas', 'Despesas Administrativas', '7.03', false, true, true),
            (NULL, 'saida', 'Assinaturas', 'Despesas Administrativas', '7.04', false, true, true),
            (NULL, 'saida', 'Honorários Contábeis', 'Despesas Administrativas', '7.05', false, true, true),
            (NULL, 'saida', 'Honorários Jurídicos', 'Despesas Administrativas', '7.06', false, true, true),
            -- 08 – Despesas Financeiras
            (NULL, 'saida', 'Tarifas Bancárias', 'Despesas Financeiras', '8.01', false, true, true),
            (NULL, 'saida', 'Juros Pagos', 'Despesas Financeiras', '8.02', false, true, true),
            (NULL, 'saida', 'Multas', 'Despesas Financeiras', '8.03', false, true, true),
            (NULL, 'saida', 'Taxas de Cartão (Maquininha)', 'Despesas Financeiras', '8.04', false, true, true),
            (NULL, 'saida', 'Tarifa de PIX', 'Despesas Financeiras', '8.05', false, true, true),
            (NULL, 'saida', 'TED/DOC', 'Despesas Financeiras', '8.06', false, true, true),
            -- 09 – Impostos
            (NULL, 'saida', 'ISS', 'Impostos', '9.01', false, true, true),
            (NULL, 'saida', 'ICMS', 'Impostos', '9.02', false, true, true),
            (NULL, 'saida', 'PIS', 'Impostos', '9.03', false, true, true),
            (NULL, 'saida', 'COFINS', 'Impostos', '9.04', false, true, true),
            (NULL, 'saida', 'Simples Nacional', 'Impostos', '9.05', false, true, true),
            (NULL, 'saida', 'Retenções', 'Impostos', '9.06', false, true, true),
            -- 10 – Transferências / Bancário
            (NULL, 'ambos', 'Transferência entre Contas', 'Transferências / Bancário', '10.01', true, true, true),
            (NULL, 'saida', 'Saque', 'Transferências / Bancário', '10.02', false, true, true),
            (NULL, 'entrada', 'Depósito', 'Transferências / Bancário', '10.03', true, false, true),
            (NULL, 'saida', 'Aplicação Financeira', 'Transferências / Bancário', '10.04', false, true, true),
            (NULL, 'entrada', 'Resgate de Aplicação', 'Transferências / Bancário', '10.05', true, false, true)
        ON CONFLICT (company_id, code) DO UPDATE 
        SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true;
    END IF;
END $$;

