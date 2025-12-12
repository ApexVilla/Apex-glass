import { supabase } from '@/integrations/supabase/client';

export type PriceStatus = 'OK' | 'DESCONTO_EXCEDIDO' | 'ABAIXO_DO_MINIMO';
export type SaleStatus = 'normal' | 'pendente_aprovacao' | 'liberada';

export interface PriceControlSettings {
  id: string;
  company_id: string;
  controle_preco_ativo: boolean;
  desconto_maximo_vendedor: number;
  valor_minimo_sem_aprovacao: number;
  usuarios_aprovadores: string[];
  created_at: string;
  updated_at: string;
}

export interface PriceValidationResult {
  status: PriceStatus;
  needsApproval: boolean;
  message: string;
  originalPrice: number;
  finalPrice: number;
  discountPercent: number;
}

/**
 * Carrega as configurações de controle de preço da empresa
 */
export async function getPriceControlSettings(companyId: string): Promise<PriceControlSettings | null> {
  try {
    const { data, error } = await supabase
      .from('price_control_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Configuração não existe, retornar null
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao carregar configurações de controle de preço:', error);
    return null;
  }
}

/**
 * Cria ou atualiza as configurações de controle de preço
 */
export async function savePriceControlSettings(
  companyId: string,
  settings: Partial<PriceControlSettings>
): Promise<PriceControlSettings> {
  // Verificar se já existe configuração
  const existing = await getPriceControlSettings(companyId);

  if (existing) {
    const { data, error } = await supabase
      .from('price_control_settings')
      .update(settings)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('price_control_settings')
      .insert([{ company_id: companyId, ...settings }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Valida o preço de um item de venda
 */
export function validateItemPrice(
  originalPrice: number,
  finalPrice: number,
  minimumPrice: number | null,
  maxDiscountPercent: number,
  settings: PriceControlSettings | null
): PriceValidationResult {
  // Se o controle de preço estiver desativado, sempre permitir
  if (!settings || !settings.controle_preco_ativo) {
    return {
      status: 'OK',
      needsApproval: false,
      message: '',
      originalPrice,
      finalPrice,
      discountPercent: 0,
    };
  }

  // Calcular desconto percentual
  const discountPercent = originalPrice > 0
    ? ((originalPrice - finalPrice) / originalPrice) * 100
    : 0;

  // Verificar se está abaixo do preço mínimo
  if (minimumPrice !== null && finalPrice < minimumPrice) {
    return {
      status: 'ABAIXO_DO_MINIMO',
      needsApproval: true,
      message: `Preço final (${finalPrice.toFixed(2)}) está abaixo do preço mínimo permitido (${minimumPrice.toFixed(2)})`,
      originalPrice,
      finalPrice,
      discountPercent,
    };
  }

  // Verificar se o desconto excede o máximo permitido
  if (discountPercent > settings.desconto_maximo_vendedor) {
    return {
      status: 'DESCONTO_EXCEDIDO',
      needsApproval: true,
      message: `Desconto de ${discountPercent.toFixed(2)}% excede o máximo permitido de ${settings.desconto_maximo_vendedor}%`,
      originalPrice,
      finalPrice,
      discountPercent,
    };
  }

  // Verificar se o valor está abaixo do mínimo sem aprovação
  if (settings.valor_minimo_sem_aprovacao > 0 && finalPrice < settings.valor_minimo_sem_aprovacao) {
    return {
      status: 'OK',
      needsApproval: true,
      message: `Valor abaixo do mínimo sem aprovação (${settings.valor_minimo_sem_aprovacao.toFixed(2)})`,
      originalPrice,
      finalPrice,
      discountPercent,
    };
  }

  return {
    status: 'OK',
    needsApproval: false,
    message: '',
    originalPrice,
    finalPrice,
    discountPercent,
  };
}

/**
 * Verifica se o usuário é um aprovador
 */
export function isApprover(userId: string, settings: PriceControlSettings | null): boolean {
  if (!settings || !settings.controle_preco_ativo) return false;
  return settings.usuarios_aprovadores.includes(userId);
}

/**
 * Aprova um item de venda
 */
export async function approveSaleItem(
  itemId: string,
  approverId: string
): Promise<void> {
  const { error } = await supabase
    .from('sale_items')
    .update({
      status_preco: 'OK',
      aprovado_por: approverId,
      aprovado_em: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Aprova uma venda completa
 */
export async function approveSale(
  saleId: string,
  approverId: string
): Promise<void> {
  // Atualizar status dos itens pendentes
  const { error: itemsError } = await supabase
    .from('sale_items')
    .update({
      status_preco: 'OK',
      aprovado_por: approverId,
      aprovado_em: new Date().toISOString(),
    })
    .eq('sale_id', saleId)
    .in('status_preco', ['DESCONTO_EXCEDIDO', 'ABAIXO_DO_MINIMO']);

  if (itemsError) throw itemsError;

  // Atualizar status da venda
  const { error: saleError } = await supabase
    .from('sales')
    .update({
      status_venda: 'liberada',
      aprovado_por: approverId,
      aprovado_em: new Date().toISOString(),
    })
    .eq('id', saleId);

  if (saleError) throw saleError;
}

/**
 * Reprova uma venda
 */
export async function rejectSale(
  saleId: string,
  approverId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .update({
      status_venda: 'normal',
      motivo_bloqueio: reason,
    })
    .eq('id', saleId);

  if (error) throw error;
}

