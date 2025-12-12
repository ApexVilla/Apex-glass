// Custom types for the Apex-Glass ERP - Using 'any' for flexible DB relations

export type UserRole = 'admin' | 'manager' | 'seller' | 'installer' | 'stock' | 'separador' | 'supervisor';
export type ServiceOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type TransactionType = 'income' | 'expense';
export type ProductType = 'windshield' | 'side_glass' | 'rear_glass' | 'rubber' | 'sensor' | 'accessory';

export interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  code?: number | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerVehicle {
  id: string;
  customer_id: string;
  company_id: string;
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  chassis?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id?: string | null;
  internal_code: string;
  manufacturer_code?: string | null;
  name: string;
  description?: string | null;
  type?: string | null;
  brand?: string | null;
  compatible_vehicles?: string | null;
  has_sensor: boolean;
  sensor_count: number;
  has_hud: boolean;
  has_band: boolean;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  min_quantity: number;
  location?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: any;
}

export interface ServiceOrder {
  id: string;
  company_id: string;
  order_number: number;
  customer_id?: string | null;
  vehicle_id?: string | null;
  technician_id?: string | null;
  status: ServiceOrderStatus;
  description?: string | null;
  notes?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  total_amount: number;
  labor_cost: number;
  signature_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: any;
  vehicle?: any;
  items?: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
  product?: any;
}

export interface Sale {
  id: string;
  company_id: string;
  sale_number: number;
  customer_id?: string | null;
  seller_id?: string | null;
  service_order_id?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method?: string | null;
  payment_status: PaymentStatus;
  notes?: string | null;
  status_codes?: string[]; // Array de códigos de pendências: E (Estoque), C (Crédito), D (Desconto)
  credit_status?: 'pending' | 'approved' | 'denied'; // Status de análise de crédito
  created_at: string;
  updated_at: string;
  customer?: any;
  seller?: any;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
  product?: any;
}

export interface FinancialTransaction {
  id: string;
  company_id: string;
  type: TransactionType;
  category?: string | null;
  description: string;
  amount: number;
  due_date?: string | null;
  paid_date?: string | null;
  status: PaymentStatus;
  reference_id?: string | null;
  reference_type?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
}
