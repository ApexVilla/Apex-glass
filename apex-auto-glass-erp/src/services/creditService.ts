import { supabase } from '@/integrations/supabase/client';

export interface CreditInfo {
  limit_total: number;
  limit_used: number;
  limit_available: number;
  total_open: number;
  total_overdue: number;
}

export interface PendingCreditSale {
  id: string;
  sale_number: number;
  customer_id: string;
  customer_name: string;
  total: number;
  payment_method: string;
  credit_status: 'pending' | 'approved' | 'denied';
  created_at: string;
  // Informações de crédito do cliente
  credit_info?: CreditInfo;
  // Informações adicionais da venda
  subtotal?: number;
  discount?: number;
  notes?: string;
  items?: any[];
}

/**
 * Busca todas as vendas aguardando análise de crédito
 */
export async function getPendingCreditSales(companyId: string): Promise<PendingCreditSale[]> {
  // Buscar todas as vendas da empresa (incluindo as que ainda não têm credit_status)
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      sale_number,
      customer_id,
      total,
      subtotal,
      discount,
      payment_method,
      credit_status,
      notes,
      created_at,
      customer:customers(id, name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar vendas pendentes:', error);
    throw error;
  }

  console.log(`[CreditService] Total de vendas encontradas: ${data?.length || 0}`);

  // Função auxiliar para verificar se precisa análise de crédito
  const requiresCreditAnalysis = (paymentMethod: string | null): boolean => {
    if (!paymentMethod) return false;
    const methodLower = paymentMethod.toLowerCase().trim();
    return (
      methodLower.includes('boleto') ||
      methodLower.includes('cartão a prazo') ||
      methodLower.includes('cartao a prazo') ||
      methodLower.includes('credito interno') ||
      methodLower.includes('crédito interno') ||
      methodLower.includes('duplicata') ||
      methodLower.includes('cheque') ||
      methodLower.includes('prazo') ||
      methodLower.includes('parcelado') ||
      methodLower === 'credito_loja' ||
      methodLower === 'credito loja'
    );
  };

  // Buscar informações de crédito para cada cliente
  const salesWithCreditInfo = await Promise.all(
    (data || []).map(async (sale) => {
      let creditInfo: CreditInfo | undefined;
      
      if (sale.customer_id) {
        try {
          creditInfo = await getCustomerCreditInfo(sale.customer_id, companyId);
        } catch (err) {
          console.error('Erro ao buscar info de crédito:', err);
        }
      }

      // Filtrar apenas vendas que realmente precisam de análise
      // (têm forma de pagamento que exige crédito OU têm credit_status = 'pending')
      const needsAnalysis = sale.credit_status === 'pending' || 
        (sale.credit_status === null && sale.payment_method && 
         requiresCreditAnalysis(sale.payment_method));

      if (!needsAnalysis) {
        return null;
      }

      return {
        id: sale.id,
        sale_number: sale.sale_number,
        customer_id: sale.customer_id,
        customer_name: (sale.customer as any)?.name || 'Cliente não informado',
        total: sale.total || 0,
        subtotal: sale.subtotal || 0,
        discount: sale.discount || 0,
        payment_method: sale.payment_method || '',
        credit_status: sale.credit_status || 'pending',
        notes: sale.notes || '',
        created_at: sale.created_at,
        credit_info: creditInfo,
      } as PendingCreditSale;
    })
  );

  // Filtrar nulls (vendas que não precisam de análise)
  const filtered = salesWithCreditInfo.filter((sale): sale is PendingCreditSale => sale !== null);
  
  console.log(`[CreditService] Vendas que precisam de análise: ${filtered.length}`);
  
  return filtered;
}

/**
 * Obtém informações de crédito do cliente
 */
export async function getCustomerCreditInfo(
  customerId: string,
  companyId: string
): Promise<CreditInfo> {
  const { data, error } = await supabase.rpc('get_customer_credit_info', {
    p_customer_id: customerId,
    p_company_id: companyId,
  });

  if (error) {
    console.error('Erro ao buscar info de crédito:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      limit_total: 0,
      limit_used: 0,
      limit_available: 0,
      total_open: 0,
      total_overdue: 0,
    };
  }

  return data[0] as CreditInfo;
}

/**
 * Aprova crédito de uma venda
 */
export async function approveCredit(
  saleId: string,
  analyzedBy: string,
  reason?: string,
  details?: Record<string, any>
): Promise<void> {
  const { error } = await supabase.rpc('approve_credit', {
    p_sale_id: saleId,
    p_analyzed_by: analyzedBy,
    p_reason: reason || null,
    p_details: details || {},
  });

  if (error) {
    console.error('Erro ao aprovar crédito:', error);
    throw error;
  }
}

/**
 * Nega crédito de uma venda
 */
export async function denyCredit(
  saleId: string,
  analyzedBy: string,
  reason: string,
  details?: Record<string, any>
): Promise<void> {
  if (!reason || reason.trim() === '') {
    throw new Error('Motivo da negação é obrigatório');
  }

  const { error } = await supabase.rpc('deny_credit', {
    p_sale_id: saleId,
    p_analyzed_by: analyzedBy,
    p_reason: reason,
    p_details: details || {},
  });

  if (error) {
    console.error('Erro ao negar crédito:', error);
    throw error;
  }
}

/**
 * Solicita ajuste de crédito
 */
export async function requestCreditAdjustment(
  saleId: string,
  analyzedBy: string,
  reason: string,
  adjustmentType: string,
  adjustmentDetails?: Record<string, any>,
  details?: Record<string, any>
): Promise<void> {
  if (!reason || reason.trim() === '') {
    throw new Error('Motivo do ajuste é obrigatório');
  }

  const { error } = await supabase.rpc('request_credit_adjustment', {
    p_sale_id: saleId,
    p_analyzed_by: analyzedBy,
    p_reason: reason,
    p_adjustment_type: adjustmentType,
    p_adjustment_details: adjustmentDetails || {},
    p_details: details || {},
  });

  if (error) {
    console.error('Erro ao solicitar ajuste:', error);
    throw error;
  }
}

/**
 * Busca detalhes completos de uma venda
 */
export async function getSaleDetails(saleId: string): Promise<any> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      customer:customers(*),
      items:sale_items(
        *,
        product:products(*)
      ),
      seller:profiles(id, full_name)
    `)
    .eq('id', saleId)
    .single();

  if (error) {
    console.error('Erro ao buscar detalhes da venda:', error);
    throw error;
  }

  return data;
}

/**
 * Busca histórico de logs de crédito de uma venda
 */
export async function getCreditLogs(saleId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('credit_logs')
    .select(`
      *,
      analyzed_by_profile:profiles(id, full_name)
    `)
    .eq('sale_id', saleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar logs de crédito:', error);
    throw error;
  }

  return data || [];
}

