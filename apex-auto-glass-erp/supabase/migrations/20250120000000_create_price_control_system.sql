-- Sistema de Controle de Preço e Permissões
-- Esta migração cria a estrutura necessária para controle de preços e aprovações

-- 1. Criar ENUM para status de preço
CREATE TYPE public.price_status AS ENUM ('OK', 'DESCONTO_EXCEDIDO', 'ABAIXO_DO_MINIMO');

-- 2. Criar ENUM para status de venda
CREATE TYPE public.sale_status AS ENUM ('normal', 'pendente_aprovacao', 'liberada');

-- 3. Criar tabela de configurações de controle de preço
CREATE TABLE IF NOT EXISTS public.price_control_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  controle_preco_ativo BOOLEAN DEFAULT false,
  desconto_maximo_vendedor DECIMAL(5,2) DEFAULT 10.00, -- Percentual máximo de desconto
  valor_minimo_sem_aprovacao DECIMAL(12,2) DEFAULT 0.00, -- Valor mínimo que não precisa aprovação
  usuarios_aprovadores UUID[] DEFAULT ARRAY[]::UUID[], -- Lista de IDs de usuários aprovadores
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Adicionar campos na tabela sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status_venda sale_status DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS solicitado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- 5. Adicionar campos na tabela sale_items
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS preco_original DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS preco_final DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS desconto_percentual DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto_tipo TEXT, -- 'percentual' ou 'valor'
ADD COLUMN IF NOT EXISTS status_preco price_status DEFAULT 'OK',
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;

-- 6. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_price_control_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_control_settings_updated_at
BEFORE UPDATE ON public.price_control_settings
FOR EACH ROW
EXECUTE FUNCTION update_price_control_settings_updated_at();

-- 7. Habilitar RLS na tabela de configurações
ALTER TABLE public.price_control_settings ENABLE ROW LEVEL SECURITY;

-- 8. Criar políticas RLS para price_control_settings
CREATE POLICY "Users can view price control settings in their company"
ON public.price_control_settings FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins and managers can update price control settings"
ON public.price_control_settings FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id() AND
  (public.has_role(auth.uid(), 'admin'::user_role) OR 
   public.has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Admins and managers can insert price control settings"
ON public.price_control_settings FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id() AND
  (public.has_role(auth.uid(), 'admin'::user_role) OR 
   public.has_role(auth.uid(), 'manager'::user_role))
);

-- 9. Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_sales_status_venda ON public.sales(status_venda);
CREATE INDEX IF NOT EXISTS idx_sale_items_status_preco ON public.sale_items(status_preco);
CREATE INDEX IF NOT EXISTS idx_price_control_settings_company ON public.price_control_settings(company_id);

