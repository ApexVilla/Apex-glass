// Tipos para o módulo financeiro

export type FinancialNatureType = 'entrada' | 'saida' | 'ambos';
export type AccountType = 'caixa' | 'banco' | 'carteira';
export type PaymentMethod = 
  | 'pix' 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'boleto' 
  | 'transferencia' 
  | 'ted' 
  | 'cheque' 
  | 'cartao_corporativo';

export type ReceivableStatus = 'em_aberto' | 'pago_parcial' | 'pago_total' | 'cancelado';
export type PayableStatus = 'em_aberto' | 'pago_parcial' | 'pago_total' | 'cancelado';
export type ReconciliationStatus = 'pendente' | 'conciliado' | 'divergente';

// Natureza Financeira
export interface FinancialNature {
  id: string;
  company_id: string;
  type: FinancialNatureType;
  name: string;
  category?: string;
  subcategory?: string;
  appears_in_receivables: boolean;
  appears_in_payables: boolean;
  code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Novos campos
  usada_em_vendas?: boolean;
  usada_em_compras?: boolean;
  usada_em_despesas?: boolean;
  usada_no_caixa?: boolean;
  gerar_automatico?: boolean;
  permitir_edicao?: boolean;
  descricao?: string;
}

// Centro de Custo
export interface CostCenter {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  code?: string;
  type?: 'receita' | 'despesa' | 'misto';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Conta Bancária/Caixa
export interface FinancialAccount {
  id: string;
  company_id: string;
  name: string;
  type: AccountType;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  initial_balance: number;
  current_balance: number;
  allow_reconciliation: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Conta a Receber
export interface AccountReceivable {
  id: string;
  company_id: string;
  transaction_number: number;
  launch_date: string;
  expected_receipt_date: string;
  customer_id?: string;
  customer?: {
    id: string;
    name: string;
  };
  description: string;
  observation?: string;
  nature_id?: string;
  nature?: FinancialNature;
  nature_category?: string;
  cost_center_id?: string;
  cost_center?: CostCenter;
  payment_method?: PaymentMethod;
  entry_value: number;
  discount: number;
  net_value: number;
  paid_value: number;
  status: ReceivableStatus;
  payment_proof_url?: string;
  invoice_number?: string;
  seller_id?: string;
  seller?: {
    id: string;
    full_name: string;
  };
  destination_account_id?: string;
  destination_account?: FinancialAccount;
  created_by: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

// Conta a Pagar
export interface AccountPayable {
  id: string;
  company_id: string;
  transaction_number: number;
  launch_date: string;
  due_date: string;
  supplier_id?: string;
  supplier?: {
    id: string;
    nome_razao: string;
  };
  description: string;
  nature_id?: string;
  nature?: FinancialNature;
  cost_center_id?: string;
  cost_center?: CostCenter;
  origin_account_id?: string;
  origin_account?: FinancialAccount;
  payment_method?: PaymentMethod;
  total_value: number;
  interest_fine: number;
  final_value: number;
  paid_value: number;
  status: PayableStatus;
  attachment_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}

// Movimentação Financeira
export interface FinancialMovement {
  id: string;
  company_id: string;
  account_id: string;
  account?: FinancialAccount;
  movement_date: string;
  movement_type: 'entrada' | 'saida' | 'transferencia';
  description: string;
  value: number;
  receivable_id?: string;
  payable_id?: string;
  nature_id?: string;
  nature?: FinancialNature;
  cost_center_id?: string;
  cost_center?: CostCenter;
  operator_id?: string;
  operator?: {
    id: string;
    full_name: string;
  };
  is_reversed: boolean;
  reversed_at?: string;
  reversed_by?: string;
  reverse_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Transferência entre Contas
export interface AccountTransfer {
  id: string;
  company_id: string;
  from_account_id: string;
  from_account?: FinancialAccount;
  to_account_id: string;
  to_account?: FinancialAccount;
  transfer_date: string;
  value: number;
  description?: string;
  from_movement_id?: string;
  to_movement_id?: string;
  created_by: string;
  created_at: string;
}

// Conciliação Bancária
export interface BankReconciliation {
  id: string;
  company_id: string;
  account_id: string;
  account?: FinancialAccount;
  reconciliation_date: string;
  statement_balance: number;
  system_balance: number;
  difference: number;
  status: ReconciliationStatus;
  notes?: string;
  ofx_file_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Item de Conciliação
export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  statement_date: string;
  statement_value: number;
  statement_description?: string;
  movement_id?: string;
  movement?: FinancialMovement;
  is_matched: boolean;
  matched_at?: string;
  matched_by?: string;
  notes?: string;
  created_at: string;
}

// Parcela
export interface FinancialInstallment {
  id: string;
  company_id: string;
  parent_receivable_id?: string;
  parent_payable_id?: string;
  installment_number: number;
  due_date: string;
  value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago_parcial' | 'pago_total' | 'cancelado';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// Anexo
export interface FinancialAttachment {
  id: string;
  company_id: string;
  receivable_id?: string;
  payable_id?: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
}

// Formulários
export interface ReceivableFormData {
  launch_date: string;
  expected_receipt_date: string;
  customer_id?: string;
  description: string;
  observation?: string;
  nature_id?: string;
  nature_category?: string;
  cost_center_id?: string;
  payment_method?: PaymentMethod;
  entry_value: number;
  discount: number;
  invoice_number?: string;
  destination_account_id?: string;
}

export interface PayableFormData {
  launch_date: string;
  due_date: string;
  supplier_id?: string;
  description: string;
  nature_id?: string;
  cost_center_id?: string;
  origin_account_id?: string;
  payment_method?: PaymentMethod;
  total_value: number;
  interest_fine: number;
}

export interface NatureFormData {
  type: FinancialNatureType;
  name: string;
  category?: string;
  subcategory?: string;
  appears_in_receivables: boolean;
  appears_in_payables: boolean;
  code?: string;
  is_active: boolean;
  // Novos campos
  usada_em_vendas?: boolean;
  usada_em_compras?: boolean;
  usada_em_despesas?: boolean;
  usada_no_caixa?: boolean;
  gerar_automatico?: boolean;
  permitir_edicao?: boolean;
  descricao?: string;
}

export interface CostCenterFormData {
  name: string;
  description?: string;
  code?: string;
  type?: 'receita' | 'despesa' | 'misto';
  is_active: boolean;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  initial_balance: number;
  allow_reconciliation: boolean;
  is_active: boolean;
}

// Filtros
export interface FinancialFilters {
  start_date?: string;
  end_date?: string;
  nature_id?: string;
  cost_center_id?: string;
  account_id?: string;
  operator_id?: string;
  status?: string;
  search?: string;
}

// Relatórios
export interface DailyReport {
  date: string;
  entries: number;
  exits: number;
  balance: number;
  movements: FinancialMovement[];
}

export interface MonthlyReport {
  month: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  by_nature: { nature: string; value: number }[];
  by_cost_center: { cost_center: string; value: number }[];
}

export interface CashFlowReport {
  date: string;
  expected_income: number;
  expected_expenses: number;
  actual_income: number;
  actual_expenses: number;
  expected_balance: number;
  actual_balance: number;
}

export interface DelinquencyReport {
  customer_id: string;
  customer_name: string;
  total_pending: number;
  days_overdue: number;
  oldest_due_date: string;
  receivables: AccountReceivable[];
}

