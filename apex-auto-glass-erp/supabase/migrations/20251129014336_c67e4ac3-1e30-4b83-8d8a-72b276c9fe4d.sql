-- Create ENUM types
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'seller', 'installer');
CREATE TYPE public.service_order_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Companies table (for multi-tenant)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (user profiles with company association)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'seller',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (for RLS without recursion)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, role, company_id)
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer vehicles
CREATE TABLE public.customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  chassis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product categories
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products/Inventory
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  internal_code TEXT NOT NULL,
  manufacturer_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- windshield, side_glass, rear_glass, rubber, sensor, accessory
  brand TEXT,
  compatible_vehicles TEXT,
  has_sensor BOOLEAN DEFAULT false,
  sensor_count INTEGER DEFAULT 0,
  has_hud BOOLEAN DEFAULT false,
  has_band BOOLEAN DEFAULT false,
  purchase_price DECIMAL(12,2) DEFAULT 0,
  sale_price DECIMAL(12,2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  location TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory movements
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'in' or 'out'
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID, -- Can reference sale or service order
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Orders
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES auth.users(id),
  status service_order_status NOT NULL DEFAULT 'open',
  description TEXT,
  notes TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  total_amount DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  signature_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service Order Items
CREATE TABLE public.service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  sale_number SERIAL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT,
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sale Items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Transactions
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status payment_status DEFAULT 'pending',
  reference_id UUID, -- Can reference sale or expense
  reference_type TEXT, -- 'sale', 'expense', 'manual'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity Log
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- RLS Policies for companies
CREATE POLICY "Users can view their company"
ON public.companies FOR SELECT
TO authenticated
USING (id = public.get_user_company_id());

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their company"
ON public.customers FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert customers in their company"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update customers in their company"
ON public.customers FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete customers in their company"
ON public.customers FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for customer_vehicles
CREATE POLICY "Users can manage vehicles in their company"
ON public.customer_vehicles FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for product_categories
CREATE POLICY "Users can manage categories in their company"
ON public.product_categories FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for products
CREATE POLICY "Users can manage products in their company"
ON public.products FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for inventory_movements
CREATE POLICY "Users can manage inventory in their company"
ON public.inventory_movements FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for service_orders
CREATE POLICY "Users can manage service orders in their company"
ON public.service_orders FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for service_order_items
CREATE POLICY "Users can manage service order items"
ON public.service_order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so 
    WHERE so.id = service_order_id 
    AND so.company_id = public.get_user_company_id()
  )
);

-- RLS Policies for sales
CREATE POLICY "Users can manage sales in their company"
ON public.sales FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for sale_items
CREATE POLICY "Users can manage sale items"
ON public.sale_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_id 
    AND s.company_id = public.get_user_company_id()
  )
);

-- RLS Policies for financial_transactions
CREATE POLICY "Users can manage financial transactions in their company"
ON public.financial_transactions FOR ALL
TO authenticated
USING (company_id = public.get_user_company_id());

-- RLS Policies for activity_logs
CREATE POLICY "Users can view logs in their company"
ON public.activity_logs FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert logs in their company"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their company"
ON public.user_roles FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user
  INSERT INTO public.companies (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    NEW.email
  )
  RETURNING id INTO new_company_id;
  
  -- Create profile
  INSERT INTO public.profiles (id, company_id, full_name, email, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'admin'
  );
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (NEW.id, 'admin', new_company_id);
  
  -- Create default product categories
  INSERT INTO public.product_categories (company_id, name) VALUES
    (new_company_id, 'Para-brisas'),
    (new_company_id, 'Vidros Laterais'),
    (new_company_id, 'Vidros Traseiros'),
    (new_company_id, 'Borrachas'),
    (new_company_id, 'Sensores'),
    (new_company_id, 'Acessórios');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_vehicles_updated_at BEFORE UPDATE ON public.customer_vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate internal product code
CREATE OR REPLACE FUNCTION public.generate_product_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
BEGIN
  -- Set prefix based on type
  prefix := CASE NEW.type
    WHEN 'windshield' THEN 'PB'
    WHEN 'side_glass' THEN 'VL'
    WHEN 'rear_glass' THEN 'VT'
    WHEN 'rubber' THEN 'BR'
    WHEN 'sensor' THEN 'SN'
    ELSE 'AC'
  END;
  
  -- Get next number for this company
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_code FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.products
  WHERE company_id = NEW.company_id AND internal_code LIKE prefix || '%';
  
  -- Set the internal code
  NEW.internal_code := prefix || LPAD(next_num::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for auto-generating product codes
CREATE TRIGGER generate_product_code_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.internal_code IS NULL OR NEW.internal_code = '')
  EXECUTE FUNCTION public.generate_product_code();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;