import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para gerenciar status de pendências nas vendas
 * Status: E (Estoque), C (Crédito), D (Desconto)
 */

/**
 * Adiciona um status à venda
 */
export async function addSaleStatus(saleId: string, statusCode: 'E' | 'C' | 'D'): Promise<void> {
  const { error } = await supabase.rpc('add_sale_status', {
    p_sale_id: saleId,
    p_status_code: statusCode
  });

  if (error) {
    console.error(`Erro ao adicionar status ${statusCode} à venda:`, error);
    throw error;
  }
}

/**
 * Remove um status da venda
 */
export async function removeSaleStatus(saleId: string, statusCode: 'E' | 'C' | 'D'): Promise<void> {
  const { error } = await supabase.rpc('remove_sale_status', {
    p_sale_id: saleId,
    p_status_code: statusCode
  });

  if (error) {
    console.error(`Erro ao remover status ${statusCode} da venda:`, error);
    throw error;
  }
}

/**
 * Verifica se a venda pode ser faturada (sem pendências)
 */
export async function canInvoiceSale(saleId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_invoice_sale', {
    p_sale_id: saleId
  });

  if (error) {
    console.error('Erro ao verificar se pode faturar:', error);
    return false;
  }

  return data === true;
}

/**
 * Verifica se a venda possui um status específico
 */
export async function hasSaleStatus(saleId: string, statusCode: 'E' | 'C' | 'D'): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_sale_status', {
    p_sale_id: saleId,
    p_status_code: statusCode
  });

  if (error) {
    console.error(`Erro ao verificar status ${statusCode}:`, error);
    return false;
  }

  return data === true;
}

/**
 * Verifica se o método de pagamento exige aprovação financeira (status C)
 * Boleto e Crédito Loja sempre exigem aprovação
 */
export function requiresCreditApproval(paymentMethod: string | null | undefined): boolean {
  if (!paymentMethod) return false;
  
  const methodLower = paymentMethod.toLowerCase().trim();
  
  // Métodos que sempre exigem aprovação (match exato ou contém)
  const methodsRequiringApproval = [
    'credito_loja',
    'credito loja',
    'boleto',
    'credit',
    'credito',
    'prazo',
    'parcelado',
    'cheque'
  ];

  // Verificar match exato primeiro
  if (methodsRequiringApproval.includes(methodLower)) {
    return true;
  }

  // Verificar se contém algum dos métodos (para variações)
  return methodsRequiringApproval.some(method => 
    methodLower.includes(method.toLowerCase()) || method.toLowerCase().includes(methodLower)
  );
}

/**
 * Calcula o saldo devedor do cliente (soma de vendas pendentes)
 * @param excludeSaleId - ID da venda a ser excluída do cálculo (útil para edição)
 */
export async function calculateCustomerDebt(
  customerId: string | null | undefined,
  excludeSaleId?: string | null
): Promise<number> {
  if (!customerId) return 0;

  try {
    let query = supabase
      .from('sales')
      .select('total')
      .eq('customer_id', customerId)
      .in('payment_status', ['pending', 'overdue']);

    // Se for edição, excluir a venda atual do cálculo
    if (excludeSaleId) {
      query = query.neq('id', excludeSaleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao calcular saldo devedor:', error);
      return 0;
    }

    return data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
  } catch (error) {
    console.error('Erro ao calcular saldo devedor:', error);
    return 0;
  }
}

/**
 * Verifica se o cliente pode realizar a venda considerando o limite de crédito
 * @param excludeSaleId - ID da venda a ser excluída do cálculo (útil para edição)
 */
export async function canCustomerMakeCreditSale(
  customerId: string | null | undefined,
  customerCreditLimit: number | null | undefined,
  saleTotal: number,
  excludeSaleId?: string | null
): Promise<{ allowed: boolean; reason?: string; currentDebt?: number; availableCredit?: number }> {
  if (!customerId) {
    return { allowed: false, reason: 'Cliente não informado' };
  }

  const creditLimit = customerCreditLimit || 0;
  
  // Se não há limite de crédito cadastrado, permitir (mas ainda adicionar status C)
  if (creditLimit <= 0) {
    return { allowed: true, currentDebt: 0, availableCredit: 0 };
  }

  // Calcular saldo devedor atual (excluindo a venda atual se for edição)
  const currentDebt = await calculateCustomerDebt(customerId, excludeSaleId);
  const availableCredit = creditLimit - currentDebt;
  const newDebt = currentDebt + saleTotal;

  // Verificar se a nova venda ultrapassa o limite
  if (newDebt > creditLimit) {
    return {
      allowed: false,
      reason: `Limite de crédito excedido. Limite: ${creditLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, Saldo atual: ${currentDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, Disponível: ${availableCredit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      currentDebt,
      availableCredit
    };
  }

  return {
    allowed: true,
    currentDebt,
    availableCredit: availableCredit - saleTotal
  };
}

/**
 * Verifica se o desconto excede o limite permitido (status D)
 */
export function requiresDiscountApproval(
  discount: number,
  subtotal: number,
  maxDiscountPercent: number = 100
): boolean {
  if (discount <= 0 || subtotal <= 0) return false;
  
  const discountPercent = (discount / subtotal) * 100;
  return discountPercent > maxDiscountPercent;
}

/**
 * Verifica se há produtos que precisam de separação (status E)
 */
export function requiresStockSeparation(items: any[]): boolean {
  return items.some(item => {
    // Verificar se é produto (não serviço)
    const isProduct = item.product?.tipo_item === 'produto' || 
                     (!item.product?.tipo_item && item.product_id); // Assumir produto se não tiver tipo_item
    
    return isProduct && item.product_id;
  });
}

/**
 * Obtém a descrição do status
 */
export function getStatusDescription(statusCode: 'E' | 'C' | 'D'): string {
  const descriptions = {
    E: 'Pendência de Estoque',
    C: 'Pendência de Crédito',
    D: 'Pendência de Desconto'
  };
  return descriptions[statusCode] || statusCode;
}

/**
 * Obtém a cor do badge do status
 */
export function getStatusColor(statusCode: 'E' | 'C' | 'D'): string {
  const colors = {
    E: 'bg-yellow-100 text-yellow-800',
    C: 'bg-blue-100 text-blue-800',
    D: 'bg-orange-100 text-orange-800'
  };
  return colors[statusCode] || 'bg-gray-100 text-gray-800';
}

