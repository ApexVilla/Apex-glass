-- Add status to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add customer_id to invoice_headers to support Entry from Customer (Returns)
ALTER TABLE public.invoice_headers ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_customer_id ON public.invoice_headers(customer_id);
