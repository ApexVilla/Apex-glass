import { supabase } from '@/integrations/supabase/client';
import { FinancialMovement } from '@/types/financial';

/**
 * Serviço para integração automática entre vendas, contas a receber/pagar e caixa
 */

interface CreateCashMovementParams {
  company_id: string;
  account_id: string;
  movement_date: string;
  movement_type: 'entrada' | 'saida';
  description: string;
  value: number;
  nature_id?: string;
  cost_center_id?: string;
  reference_type: 'sale' | 'receivable' | 'payable' | 'expense' | 'manual' | 'transfer';
  reference_id: string;
  payment_method?: string;
  category?: string;
  operator_id?: string;
  created_by: string;
  is_automatic?: boolean;
}

/**
 * Cria uma movimentação de caixa automaticamente
 */
export async function createAutomaticCashMovement(
  params: CreateCashMovementParams
): Promise<FinancialMovement | null> {
  try {
    const { data, error } = await supabase
      .from('financial_movements')
      .insert([
        {
          ...params,
          is_automatic: params.is_automatic ?? true,
          is_reversed: false,
        },
      ])
      .select(`
        *,
        account:financial_accounts(*),
        nature:financial_natures(*),
        cost_center:cost_centers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Erro ao criar movimentação automática:', error);
    throw error;
  }
}

/**
 * Cria entrada de caixa quando uma venda é paga
 */
export async function createCashEntryFromSale(
  saleId: string,
  amount: number,
  paymentMethod: string,
  accountId: string,
  companyId: string,
  userId: string
): Promise<FinancialMovement | null> {
  try {
    // Buscar dados da venda
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, customer:customers(name)')
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;

    // Buscar natureza financeira padrão para vendas
    const { data: nature } = await supabase
      .from('financial_natures')
      .select('id')
      .eq('company_id', companyId)
      .eq('type', 'entrada')
      .eq('usada_em_vendas', true)
      .eq('is_active', true)
      .limit(1)
      .single();

    return await createAutomaticCashMovement({
      company_id: companyId,
      account_id: accountId,
      movement_date: new Date().toISOString().split('T')[0],
      movement_type: 'entrada',
      description: `Recebimento de venda #${sale.sale_number} - ${sale.customer?.name || 'Cliente'}`,
      value: amount,
      nature_id: nature?.id,
      reference_type: 'sale',
      reference_id: saleId,
      payment_method: paymentMethod,
      category: 'venda',
      created_by: userId,
      is_automatic: true,
    });
  } catch (error: any) {
    console.error('Erro ao criar entrada de caixa da venda:', error);
    throw error;
  }
}

/**
 * Cria entrada de caixa quando uma conta a receber é paga
 */
export async function createCashEntryFromReceivable(
  receivableId: string,
  amount: number,
  paymentMethod: string,
  accountId: string,
  companyId: string,
  userId: string
): Promise<FinancialMovement | null> {
  try {
    // Buscar dados da conta a receber
    const { data: receivable, error: receivableError } = await supabase
      .from('accounts_receivable')
      .select('*, customer:customers(name)')
      .eq('id', receivableId)
      .single();

    if (receivableError) throw receivableError;

    return await createAutomaticCashMovement({
      company_id: companyId,
      account_id: accountId,
      movement_date: new Date().toISOString().split('T')[0],
      movement_type: 'entrada',
      description: `Recebimento de conta a receber #${receivable.transaction_number} - ${receivable.customer?.name || 'Cliente'}`,
      value: amount,
      nature_id: receivable.nature_id,
      cost_center_id: receivable.cost_center_id,
      reference_type: 'receivable',
      reference_id: receivableId,
      payment_method: paymentMethod,
      category: 'recebimento',
      created_by: userId,
      is_automatic: true,
    });
  } catch (error: any) {
    console.error('Erro ao criar entrada de caixa da conta a receber:', error);
    throw error;
  }
}

/**
 * Cria saída de caixa quando uma conta a pagar é paga
 */
export async function createCashExitFromPayable(
  payableId: string,
  amount: number,
  paymentMethod: string,
  accountId: string,
  companyId: string,
  userId: string
): Promise<FinancialMovement | null> {
  try {
    // Buscar dados da conta a pagar
    const { data: payable, error: payableError } = await supabase
      .from('accounts_payable')
      .select('*, supplier:suppliers(nome_razao)')
      .eq('id', payableId)
      .single();

    if (payableError) throw payableError;

    return await createAutomaticCashMovement({
      company_id: companyId,
      account_id: accountId,
      movement_date: new Date().toISOString().split('T')[0],
      movement_type: 'saida',
      description: `Pagamento de conta a pagar #${payable.transaction_number} - ${payable.supplier?.nome_razao || 'Fornecedor'}`,
      value: amount,
      nature_id: payable.nature_id,
      cost_center_id: payable.cost_center_id,
      reference_type: 'payable',
      reference_id: payableId,
      payment_method: paymentMethod,
      category: 'pagamento',
      created_by: userId,
      is_automatic: true,
    });
  } catch (error: any) {
    console.error('Erro ao criar saída de caixa da conta a pagar:', error);
    throw error;
  }
}

/**
 * Verifica e cria alertas de saldo baixo
 */
export async function checkAndCreateBalanceAlerts(companyId: string): Promise<void> {
  try {
    // Chamar função do banco de dados
    const { error } = await supabase.rpc('check_low_balance_alerts');

    if (error) {
      // Se a função não existir, criar alertas manualmente
      const { data: accounts } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!accounts) return;

      for (const account of accounts) {
        // Verificar saldo baixo (padrão: < R$ 1000)
        if (account.current_balance < 1000 && account.current_balance >= 0) {
          // Verificar se já existe alerta ativo
          const { data: existingAlert } = await supabase
            .from('cash_balance_alerts')
            .select('id')
            .eq('account_id', account.id)
            .eq('alert_type', 'low_balance')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!existingAlert) {
            await supabase.from('cash_balance_alerts').insert([
              {
                company_id: companyId,
                account_id: account.id,
                threshold_amount: 1000,
                current_balance: account.current_balance,
                alert_type: 'low_balance',
                is_active: true,
              },
            ]);
          }
        }

        // Verificar saldo negativo
        if (account.current_balance < 0) {
          const { data: existingAlert } = await supabase
            .from('cash_balance_alerts')
            .select('id')
            .eq('account_id', account.id)
            .eq('alert_type', 'negative_balance')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!existingAlert) {
            await supabase.from('cash_balance_alerts').insert([
              {
                company_id: companyId,
                account_id: account.id,
                threshold_amount: 0,
                current_balance: account.current_balance,
                alert_type: 'negative_balance',
                is_active: true,
              },
            ]);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Erro ao verificar alertas de saldo:', error);
  }
}

/**
 * Marca uma movimentação como conciliada
 */
export async function reconcileMovement(
  movementId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('financial_movements')
      .update({
        is_reconciled: true,
        reconciled_at: new Date().toISOString(),
        reconciled_by: userId,
      })
      .eq('id', movementId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Erro ao conciliar movimentação:', error);
    throw error;
  }
}

/**
 * Desmarca uma movimentação como conciliada
 */
export async function unreconcileMovement(movementId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('financial_movements')
      .update({
        is_reconciled: false,
        reconciled_at: null,
        reconciled_by: null,
      })
      .eq('id', movementId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Erro ao desconciliar movimentação:', error);
    throw error;
  }
}

