-- ============================================
-- SCRIPT PARA CADASTRAR CENTROS DE CUSTO
-- Copie TODO este conteúdo e cole no SQL Editor do Supabase
-- ============================================

-- Este script cadastra os centros de custo padrão para todas as empresas existentes
-- Os centros de custo serão inseridos apenas se ainda não existirem (verificação por código)

-- 1. Garantir que o campo 'type' existe na tabela cost_centers
ALTER TABLE public.cost_centers
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('receita', 'despesa', 'misto')) DEFAULT 'misto';

-- 2. Atualizar registros existentes para ter tipo misto se estiverem NULL
UPDATE public.cost_centers
SET type = 'misto'
WHERE type IS NULL;

-- 3. Cadastrar os centros de custo para todas as empresas
DO $$
DECLARE
  company_record RECORD;
  cost_center_record RECORD;
  cost_center_id UUID;
BEGIN
  -- Loop através de todas as empresas
  FOR company_record IN SELECT id FROM public.companies
  LOOP
    -- Loop através de cada centro de custo usando VALUES
    FOR cost_center_record IN 
      SELECT 
        column1::TEXT as code,
        column2::TEXT as name,
        column3::TEXT as description,
        column4::TEXT as type
      FROM (VALUES
        ('1000', 'Vendas', 'Custos relacionados à equipe de vendas, comissões, promoções e marketing de vendas.', 'misto'),
        ('1100', 'Produção / Operações', 'Custos com fabricação, matéria-prima, manutenção de máquinas e operação da produção.', 'despesa'),
        ('1200', 'Estoque / Logística', 'Custos de armazenamento, transporte, frete, embalagem e controle de estoque.', 'despesa'),
        ('1300', 'Administrativo / Geral', 'Custos com administração, escritório, TI, telefonia e serviços gerais.', 'despesa'),
        ('1400', 'Recursos Humanos', 'Custos com folha de pagamento, benefícios, treinamentos e encargos trabalhistas.', 'despesa'),
        ('1500', 'Financeiro', 'Custos com bancos, tarifas, juros, cobrança e gestão financeira.', 'despesa'),
        ('1600', 'Marketing / Publicidade', 'Investimentos em campanhas, anúncios, redes sociais, eventos e branding.', 'despesa'),
        ('1700', 'Pesquisa e Desenvolvimento', 'Custos com desenvolvimento de novos produtos, protótipos, testes e inovação.', 'despesa'),
        ('1800', 'Manutenção / Infraestrutura', 'Custos de manutenção predial, equipamentos, utilidades e infraestrutura física.', 'despesa'),
        ('1900', 'Serviços Terceirizados', 'Pagamentos a consultorias, prestadores de serviço, outsourcing e contratos externos.', 'despesa'),
        ('2000', 'Impostos e Taxas', 'Custos de tributos, taxas governamentais e obrigações fiscais diversas.', 'despesa')
      ) AS t(column1, column2, column3, column4)
    LOOP
      -- Verificar se o centro de custo já existe (por código)
      SELECT id INTO cost_center_id
      FROM public.cost_centers
      WHERE company_id = company_record.id
      AND code = cost_center_record.code
      LIMIT 1;
      
      -- Se não existir, criar
      IF cost_center_id IS NULL THEN
        INSERT INTO public.cost_centers (
          company_id,
          code,
          name,
          description,
          type,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          company_record.id,
          cost_center_record.code,
          cost_center_record.name,
          cost_center_record.description,
          cost_center_record.type,
          true,
          now(),
          now()
        );
      ELSE
        -- Se já existir, atualizar para garantir que tenha os dados corretos
        UPDATE public.cost_centers
        SET 
          name = cost_center_record.name,
          description = cost_center_record.description,
          type = cost_center_record.type,
          is_active = true,
          updated_at = now()
        WHERE id = cost_center_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Verificar os centros de custo cadastrados
SELECT 
  c.name as empresa,
  cc.code,
  cc.name as centro_custo,
  cc.type,
  cc.is_active,
  cc.description
FROM public.cost_centers cc
JOIN public.companies c ON c.id = cc.company_id
WHERE cc.code IN ('1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000')
ORDER BY c.name, cc.code;

-- Contar quantos centros de custo foram cadastrados por empresa
SELECT 
  c.name as empresa,
  COUNT(*) as total_centros_custo
FROM public.cost_centers cc
JOIN public.companies c ON c.id = cc.company_id
WHERE cc.code IN ('1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000')
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT '✅ Centros de custo cadastrados com sucesso!' as status;

