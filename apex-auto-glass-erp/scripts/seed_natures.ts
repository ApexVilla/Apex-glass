
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const natures = [
    // 1. RECEITAS (ENTRADAS)
    // 01 – Vendas
    { type: 'entrada', name: 'Venda de Produtos', category: 'Vendas', code: '1.01', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Venda de Serviços', category: 'Vendas', code: '1.02', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento de Orçamentos / OS', category: 'Vendas', code: '1.03', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento por PIX', category: 'Vendas', code: '1.04', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento em Dinheiro', category: 'Vendas', code: '1.05', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento no Cartão (Crédito)', category: 'Vendas', code: '1.06', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento no Cartão (Débito)', category: 'Vendas', code: '1.07', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento de Boleto', category: 'Vendas', code: '1.08', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Recebimento Antecipado', category: 'Vendas', code: '1.09', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Devolução de Compra (Retorno de valores)', category: 'Vendas', code: '1.10', appears_in_receivables: true, appears_in_payables: false },

    // 02 – Receitas Financeiras
    { type: 'entrada', name: 'Juros Recebidos', category: 'Receitas Financeiras', code: '2.01', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Rendimentos Bancários', category: 'Receitas Financeiras', code: '2.02', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Cashback/Estorno Recebido', category: 'Receitas Financeiras', code: '2.03', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Diferença de Caixa Positiva', category: 'Receitas Financeiras', code: '2.04', appears_in_receivables: true, appears_in_payables: false },

    // 03 – Outras Receitas
    { type: 'entrada', name: 'Venda de Ativos (equipamentos)', category: 'Outras Receitas', code: '3.01', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Receitas Diversas', category: 'Outras Receitas', code: '3.02', appears_in_receivables: true, appears_in_payables: false },
    { type: 'entrada', name: 'Reembolsos Recebidos', category: 'Outras Receitas', code: '3.03', appears_in_receivables: true, appears_in_payables: false },

    // 2. DESPESAS (SAÍDAS)
    // 04 – Compras
    { type: 'saida', name: 'Compra de Produtos para Revenda', category: 'Compras', code: '4.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Compra de Materiais', category: 'Compras', code: '4.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Compra de Insumos', category: 'Compras', code: '4.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Devolução de Venda (saída de valores)', category: 'Compras', code: '4.04', appears_in_receivables: false, appears_in_payables: true },

    // 05 – Despesas Operacionais
    { type: 'saida', name: 'Aluguel', category: 'Despesas Operacionais', code: '5.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Luz', category: 'Despesas Operacionais', code: '5.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Água', category: 'Despesas Operacionais', code: '5.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Internet', category: 'Despesas Operacionais', code: '5.04', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Telefone', category: 'Despesas Operacionais', code: '5.05', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Limpeza', category: 'Despesas Operacionais', code: '5.06', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Manutenção', category: 'Despesas Operacionais', code: '5.07', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Combustível', category: 'Despesas Operacionais', code: '5.08', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Estacionamento', category: 'Despesas Operacionais', code: '5.09', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Logística / Frete', category: 'Despesas Operacionais', code: '5.10', appears_in_receivables: false, appears_in_payables: true },

    // 06 – Pessoal
    { type: 'saida', name: 'Salários', category: 'Pessoal', code: '6.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Comissões', category: 'Pessoal', code: '6.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Benefícios', category: 'Pessoal', code: '6.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Vale Transporte', category: 'Pessoal', code: '6.04', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'FGTS / INSS / Encargos', category: 'Pessoal', code: '6.05', appears_in_receivables: false, appears_in_payables: true },

    // 07 – Despesas Administrativas
    { type: 'saida', name: 'Material de Escritório', category: 'Despesas Administrativas', code: '7.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Softwares / Serviços Online', category: 'Despesas Administrativas', code: '7.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Ferramentas', category: 'Despesas Administrativas', code: '7.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Assinaturas', category: 'Despesas Administrativas', code: '7.04', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Honorários Contábeis', category: 'Despesas Administrativas', code: '7.05', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Honorários Jurídicos', category: 'Despesas Administrativas', code: '7.06', appears_in_receivables: false, appears_in_payables: true },

    // 08 – Despesas Financeiras
    { type: 'saida', name: 'Tarifas Bancárias', category: 'Despesas Financeiras', code: '8.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Juros Pagos', category: 'Despesas Financeiras', code: '8.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Multas', category: 'Despesas Financeiras', code: '8.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Taxas de Cartão (Maquininha)', category: 'Despesas Financeiras', code: '8.04', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Tarifa de PIX', category: 'Despesas Financeiras', code: '8.05', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'TED/DOC', category: 'Despesas Financeiras', code: '8.06', appears_in_receivables: false, appears_in_payables: true },

    // 09 – Impostos
    { type: 'saida', name: 'ISS', category: 'Impostos', code: '9.01', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'ICMS', category: 'Impostos', code: '9.02', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'PIS', category: 'Impostos', code: '9.03', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'COFINS', category: 'Impostos', code: '9.04', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Simples Nacional', category: 'Impostos', code: '9.05', appears_in_receivables: false, appears_in_payables: true },
    { type: 'saida', name: 'Retenções', category: 'Impostos', code: '9.06', appears_in_receivables: false, appears_in_payables: true },

    // 10 – Transferências / Bancário
    { type: 'ambos', name: 'Transferência entre Contas', category: 'Transferências / Bancário', code: '10.01', appears_in_receivables: true, appears_in_payables: true },
    { type: 'ambos', name: 'Saque', category: 'Transferências / Bancário', code: '10.02', appears_in_receivables: true, appears_in_payables: true },
    { type: 'ambos', name: 'Depósito', category: 'Transferências / Bancário', code: '10.03', appears_in_receivables: true, appears_in_payables: true },
    { type: 'ambos', name: 'Aplicação Financeira', category: 'Transferências / Bancário', code: '10.04', appears_in_receivables: true, appears_in_payables: true },
    { type: 'ambos', name: 'Resgate de Aplicação', category: 'Transferências / Bancário', code: '10.05', appears_in_receivables: true, appears_in_payables: true },
];

async function seed() {
    console.log('Fetching companies...');
    const { data: companies, error: companyError } = await supabase.from('companies').select('id');

    if (companyError) {
        console.error('Error fetching companies:', companyError);
        return;
    }

    if (!companies || companies.length === 0) {
        console.log('No companies found.');
        return;
    }

    console.log(`Found ${companies.length} companies. Seeding natures...`);

    for (const company of companies) {
        console.log(`Seeding for company ${company.id}...`);

        for (const nature of natures) {
            const { error } = await supabase
                .from('financial_natures')
                .upsert({
                    company_id: company.id,
                    ...nature,
                    is_active: true
                }, { onConflict: 'company_id,code' }); // Assuming unique constraint exists

            if (error) {
                console.error(`Error inserting ${nature.code}:`, error.message);
            }
        }
    }

    console.log('Done!');
}

seed();
