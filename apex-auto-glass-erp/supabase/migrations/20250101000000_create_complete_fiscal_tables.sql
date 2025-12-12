-- =====================================================
-- MIGRAÇÃO COMPLETA: TABELAS FISCAIS BRASILEIRAS
-- Sistema Fiscal Apex-Glass - Todos os Modelos
-- =====================================================

-- =====================================================
-- 1. NF-e (MODELO 55) - NOTA FISCAL ELETRÔNICA
-- =====================================================

-- Tabela principal de NF-e emitidas
CREATE TABLE IF NOT EXISTS public.nfe_emitidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '55',
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_saida_entrada TIMESTAMP WITH TIME ZONE,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Emitente e Destinatário
    emitente_cnpj TEXT NOT NULL,
    emitente_razao_social TEXT NOT NULL,
    destinatario_cpf_cnpj TEXT NOT NULL,
    destinatario_razao_social TEXT NOT NULL,
    
    -- Valores
    valor_produtos NUMERIC(15,2) DEFAULT 0,
    valor_servicos NUMERIC(15,2) DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL,
    valor_icms NUMERIC(15,2) DEFAULT 0,
    valor_ipi NUMERIC(15,2) DEFAULT 0,
    valor_pis NUMERIC(15,2) DEFAULT 0,
    valor_cofins NUMERIC(15,2) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinada', 'enviada', 'autorizada', 'cancelada', 'denegada', 'rejeitada')),
    protocolo_autorizacao TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_assinado TEXT,
    xml_autorizado TEXT,
    xml_protocolo TEXT,
    
    -- Metadados
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- Itens das NF-e
CREATE TABLE IF NOT EXISTS public.nfe_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES public.nfe_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Produto
    produto_id UUID REFERENCES public.products(id),
    sequencia INTEGER NOT NULL,
    codigo TEXT,
    descricao TEXT NOT NULL,
    ncm TEXT,
    cfop TEXT,
    unidade TEXT NOT NULL,
    quantidade NUMERIC(15,4) NOT NULL,
    
    -- Valores
    valor_unitario NUMERIC(15,4) NOT NULL,
    valor_total NUMERIC(15,2) NOT NULL,
    desconto NUMERIC(15,2) DEFAULT 0,
    
    -- Impostos
    icms_cst TEXT,
    icms_csosn TEXT,
    icms_base_calculo NUMERIC(15,2) DEFAULT 0,
    icms_aliquota NUMERIC(5,2) DEFAULT 0,
    icms_valor NUMERIC(15,2) DEFAULT 0,
    
    ipi_cst TEXT,
    ipi_base_calculo NUMERIC(15,2) DEFAULT 0,
    ipi_aliquota NUMERIC(5,2) DEFAULT 0,
    ipi_valor NUMERIC(15,2) DEFAULT 0,
    
    pis_cst TEXT,
    pis_base_calculo NUMERIC(15,2) DEFAULT 0,
    pis_aliquota NUMERIC(5,2) DEFAULT 0,
    pis_valor NUMERIC(15,2) DEFAULT 0,
    
    cofins_cst TEXT,
    cofins_base_calculo NUMERIC(15,2) DEFAULT 0,
    cofins_aliquota NUMERIC(5,2) DEFAULT 0,
    cofins_valor NUMERIC(15,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos das NF-e
CREATE TABLE IF NOT EXISTS public.nfe_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES public.nfe_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Tipo de evento
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('110111', '110110', '110102', '210100', '210200', '210240', '210250')),
    descricao_evento TEXT NOT NULL,
    
    -- Dados do evento
    sequencia INTEGER NOT NULL DEFAULT 1,
    protocolo TEXT,
    justificativa TEXT,
    
    -- XMLs
    xml_evento TEXT NOT NULL,
    xml_retorno TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado', 'erro')),
    motivo_rejeicao TEXT,
    
    -- Metadados
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Cancelamentos específicos
CREATE TABLE IF NOT EXISTS public.nfe_cancelamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES public.nfe_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    justificativa TEXT NOT NULL,
    protocolo_cancelamento TEXT,
    
    xml_cancelamento TEXT,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'rejeitado')),
    data_cancelamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Cartas de Correção
CREATE TABLE IF NOT EXISTS public.nfe_cces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES public.nfe_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    sequencia INTEGER NOT NULL,
    correcao TEXT NOT NULL,
    protocolo_cc TEXT,
    
    xml_cc TEXT,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'registrado', 'rejeitado')),
    data_cc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Inutilizações
CREATE TABLE IF NOT EXISTS public.nfe_inutilizacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    serie TEXT NOT NULL,
    numero_inicial TEXT NOT NULL,
    numero_final TEXT NOT NULL,
    justificativa TEXT NOT NULL,
    
    protocolo_inutilizacao TEXT,
    xml_inutilizacao TEXT,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'rejeitado')),
    data_inutilizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 2. NFC-e (MODELO 65) - NOTA FISCAL CONSUMIDOR ELETRÔNICA
-- =====================================================

-- Tabela principal de NFC-e emitidas
CREATE TABLE IF NOT EXISTS public.nfce_emitidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '65',
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Consumidor (pode ser anônimo)
    consumidor_cpf_cnpj TEXT,
    consumidor_nome TEXT,
    
    -- Valores
    valor_produtos NUMERIC(15,2) DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL,
    valor_icms NUMERIC(15,2) DEFAULT 0,
    valor_pis NUMERIC(15,2) DEFAULT 0,
    valor_cofins NUMERIC(15,2) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinada', 'enviada', 'autorizada', 'cancelada', 'rejeitada', 'offline')),
    protocolo_autorizacao TEXT,
    motivo_rejeicao TEXT,
    
    -- QRCode
    qrcode TEXT,
    url_consulta TEXT,
    
    -- XMLs
    xml_assinado TEXT,
    xml_autorizado TEXT,
    xml_protocolo TEXT,
    
    -- Contingência
    modo_contingencia BOOLEAN DEFAULT false,
    motivo_contingencia TEXT,
    
    -- Metadados
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- Eventos das NFC-e
CREATE TABLE IF NOT EXISTS public.nfce_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfce_id UUID NOT NULL REFERENCES public.nfce_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('110111', '110110')),
    descricao_evento TEXT NOT NULL,
    
    sequencia INTEGER NOT NULL DEFAULT 1,
    protocolo TEXT,
    justificativa TEXT,
    
    xml_evento TEXT NOT NULL,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado', 'erro')),
    motivo_rejeicao TEXT,
    
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 3. SAT/MFE (MODELO 59) - CUPOM FISCAL ELETRÔNICO
-- =====================================================

-- Configuração do SAT
CREATE TABLE IF NOT EXISTS public.sat_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    
    codigo_ativacao TEXT NOT NULL,
    numero_caixa TEXT,
    cnpj_software_house TEXT,
    assinatura_ac TEXT,
    
    -- Configurações
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    uf TEXT NOT NULL,
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    ultima_comunicacao TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cupons Fiscais Eletrônicos (CF-e)
CREATE TABLE IF NOT EXISTS public.sat_cfes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sat_config_id UUID REFERENCES public.sat_config(id),
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero_cupom TEXT NOT NULL,
    numero_sessao TEXT,
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Consumidor
    consumidor_cpf_cnpj TEXT,
    consumidor_nome TEXT,
    
    -- Valores
    valor_total NUMERIC(15,2) NOT NULL,
    valor_icms NUMERIC(15,2) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'cancelado', 'rejeitado', 'offline')),
    codigo_retorno TEXT,
    mensagem_retorno TEXT,
    
    -- XMLs
    xml_cfe TEXT,
    xml_retorno TEXT,
    xml_cancelamento TEXT,
    
    -- QRCode
    qrcode TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Eventos do SAT
CREATE TABLE IF NOT EXISTS public.sat_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cfe_id UUID NOT NULL REFERENCES public.sat_cfes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('cancelamento', 'reimpressao')),
    descricao TEXT,
    
    xml_evento TEXT,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado')),
    
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 4. CT-e (MODELO 57) - CONHECIMENTO DE TRANSPORTE ELETRÔNICO
-- =====================================================

-- Tabela principal de CT-e emitidos
CREATE TABLE IF NOT EXISTS public.cte_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '57',
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Emitente (Transportadora)
    emitente_cnpj TEXT NOT NULL,
    emitente_razao_social TEXT NOT NULL,
    
    -- Remetente
    remetente_cpf_cnpj TEXT NOT NULL,
    remetente_razao_social TEXT NOT NULL,
    
    -- Destinatário
    destinatario_cpf_cnpj TEXT NOT NULL,
    destinatario_razao_social TEXT NOT NULL,
    
    -- Modal de transporte
    modal TEXT NOT NULL CHECK (modal IN ('01', '02', '03', '04', '05', '06')),
    -- 01=Rodoviário, 02=Aéreo, 03=Aquaviário, 04=Ferroviário, 05=Dutoviário, 06=Multimodal
    
    -- Valores
    valor_prestacao NUMERIC(15,2) NOT NULL,
    valor_receber NUMERIC(15,2) DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinado', 'enviado', 'autorizado', 'cancelado', 'denegado', 'rejeitado')),
    protocolo_autorizacao TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_assinado TEXT,
    xml_autorizado TEXT,
    xml_protocolo TEXT,
    
    -- Metadados
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- Itens/Cargas do CT-e
CREATE TABLE IF NOT EXISTS public.cte_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cte_id UUID NOT NULL REFERENCES public.cte_emitidos(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Carga
    descricao TEXT NOT NULL,
    codigo_ncm TEXT,
    codigo_cfop TEXT,
    unidade TEXT,
    quantidade NUMERIC(15,4),
    peso NUMERIC(15,4),
    valor NUMERIC(15,2),
    
    -- Documentos vinculados
    tipo_documento TEXT CHECK (tipo_documento IN ('nfe', 'cte', 'mdfe')),
    chave_documento TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos do CT-e
CREATE TABLE IF NOT EXISTS public.cte_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cte_id UUID NOT NULL REFERENCES public.cte_emitidos(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('110111', '110110', '110102')),
    descricao_evento TEXT NOT NULL,
    
    sequencia INTEGER NOT NULL DEFAULT 1,
    protocolo TEXT,
    justificativa TEXT,
    
    xml_evento TEXT NOT NULL,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado', 'erro')),
    motivo_rejeicao TEXT,
    
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 5. CT-e OS (MODELO 67) - CT-e DE SERVIÇO
-- =====================================================

-- Tabela principal de CT-e OS emitidos
CREATE TABLE IF NOT EXISTS public.cte_os_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '67',
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Emitente (Transportadora)
    emitente_cnpj TEXT NOT NULL,
    emitente_razao_social TEXT NOT NULL,
    
    -- Tomador do serviço
    tomador_cpf_cnpj TEXT NOT NULL,
    tomador_razao_social TEXT NOT NULL,
    
    -- Serviço
    descricao_servico TEXT NOT NULL,
    valor_servico NUMERIC(15,2) NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinado', 'enviado', 'autorizado', 'cancelado', 'rejeitado')),
    protocolo_autorizacao TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_assinado TEXT,
    xml_autorizado TEXT,
    xml_protocolo TEXT,
    
    -- Metadados
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- =====================================================
-- 6. MDF-e (MODELO 58) - MANIFESTO DE DOCUMENTOS FISCAIS ELETRÔNICOS
-- =====================================================

-- Tabela principal de MDF-e emitidos
CREATE TABLE IF NOT EXISTS public.mdfe_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    chave_acesso TEXT NOT NULL UNIQUE,
    numero TEXT NOT NULL,
    serie TEXT NOT NULL,
    modelo TEXT NOT NULL DEFAULT '58',
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    data_encerramento TIMESTAMP WITH TIME ZONE,
    
    -- Emitente (Transportadora)
    emitente_cnpj TEXT NOT NULL,
    emitente_razao_social TEXT NOT NULL,
    
    -- Modal de transporte
    modal TEXT NOT NULL CHECK (modal IN ('01', '02', '03', '04')),
    -- 01=Rodoviário, 02=Aéreo, 03=Aquaviário, 04=Ferroviário
    
    -- Veículo
    placa_veiculo TEXT,
    renavam TEXT,
    
    -- Motorista
    motorista_cpf TEXT,
    motorista_nome TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinado', 'enviado', 'autorizado', 'encerrado', 'cancelado', 'rejeitado')),
    protocolo_autorizacao TEXT,
    protocolo_encerramento TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_assinado TEXT,
    xml_autorizado TEXT,
    xml_protocolo TEXT,
    xml_encerramento TEXT,
    
    -- Metadados
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero, serie, modelo)
);

-- Documentos vinculados ao MDF-e
CREATE TABLE IF NOT EXISTS public.mdfe_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mdfe_id UUID NOT NULL REFERENCES public.mdfe_emitidos(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('nfe', 'cte', 'cte_os')),
    chave_documento TEXT NOT NULL,
    numero_documento TEXT,
    serie_documento TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos do MDF-e
CREATE TABLE IF NOT EXISTS public.mdfe_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mdfe_id UUID NOT NULL REFERENCES public.mdfe_emitidos(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('110111', '110112', '110114')),
    -- 110111=Cancelamento, 110112=Encerramento, 110114=Inclusão Condutor
    descricao_evento TEXT NOT NULL,
    
    sequencia INTEGER NOT NULL DEFAULT 1,
    protocolo TEXT,
    justificativa TEXT,
    
    xml_evento TEXT NOT NULL,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado', 'erro')),
    motivo_rejeicao TEXT,
    
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 7. NFS-e - NOTA FISCAL DE SERVIÇO ELETRÔNICA
-- =====================================================

-- Tabela principal de NFS-e emitidas
CREATE TABLE IF NOT EXISTS public.nfse_emitidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    numero_nfse TEXT NOT NULL,
    codigo_verificacao TEXT,
    serie TEXT,
    
    -- Padrão utilizado
    padrao TEXT NOT NULL CHECK (padrao IN ('ABRASF', 'GINFES', 'BHISS', 'NACIONAL')),
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_competencia DATE NOT NULL,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    -- Prestador
    prestador_cnpj TEXT NOT NULL,
    prestador_razao_social TEXT NOT NULL,
    prestador_inscricao_municipal TEXT,
    
    -- Tomador
    tomador_cpf_cnpj TEXT NOT NULL,
    tomador_razao_social TEXT NOT NULL,
    
    -- Valores
    valor_servicos NUMERIC(15,2) NOT NULL,
    valor_deducoes NUMERIC(15,2) DEFAULT 0,
    valor_iss NUMERIC(15,2) DEFAULT 0,
    valor_iss_retido NUMERIC(15,2) DEFAULT 0,
    valor_pis NUMERIC(15,2) DEFAULT 0,
    valor_cofins NUMERIC(15,2) DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'autorizada', 'cancelada', 'substituida', 'rejeitada')),
    protocolo_autorizacao TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_rps TEXT,
    xml_nfse TEXT,
    xml_retorno TEXT,
    
    -- Metadados
    municipio_codigo TEXT NOT NULL,
    ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero_nfse, padrao, municipio_codigo)
);

-- RPS (Recibo Provisório de Serviço)
CREATE TABLE IF NOT EXISTS public.nfse_rps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfse_id UUID REFERENCES public.nfse_emitidas(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    numero_rps TEXT NOT NULL,
    serie_rps TEXT NOT NULL,
    tipo_rps TEXT NOT NULL,
    
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_competencia DATE NOT NULL,
    
    xml_rps TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'convertido', 'rejeitado')),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(company_id, numero_rps, serie_rps)
);

-- Eventos das NFS-e
CREATE TABLE IF NOT EXISTS public.nfse_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfse_id UUID NOT NULL REFERENCES public.nfse_emitidas(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('cancelamento', 'substituicao')),
    descricao TEXT,
    
    nfse_substituida_id UUID REFERENCES public.nfse_emitidas(id),
    justificativa TEXT,
    
    xml_evento TEXT,
    xml_retorno TEXT,
    
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado')),
    motivo_rejeicao TEXT,
    
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 8. GNRE - GUIA DE RECOLHIMENTO
-- =====================================================

-- Tabela de guias GNRE
CREATE TABLE IF NOT EXISTS public.gnre_guias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificação
    numero_guia TEXT,
    codigo_receita TEXT NOT NULL,
    uf_origem TEXT NOT NULL,
    uf_destino TEXT NOT NULL,
    
    -- Contribuinte
    contribuinte_cnpj TEXT NOT NULL,
    contribuinte_razao_social TEXT NOT NULL,
    
    -- Valores
    valor_principal NUMERIC(15,2) NOT NULL,
    valor_multa NUMERIC(15,2) DEFAULT 0,
    valor_juros NUMERIC(15,2) DEFAULT 0,
    valor_total NUMERIC(15,2) NOT NULL,
    
    -- Período
    periodo_referencia TEXT,
    data_vencimento DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'gerada', 'paga', 'cancelada', 'rejeitada')),
    protocolo_geracao TEXT,
    motivo_rejeicao TEXT,
    
    -- XMLs
    xml_guia TEXT,
    xml_retorno TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 9. LOGS FISCAIS GERAIS
-- =====================================================

-- Tabela de logs detalhados de todas as operações fiscais
CREATE TABLE IF NOT EXISTS public.logs_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Tipo de operação
    tipo_operacao TEXT NOT NULL,
    modelo_documento TEXT, -- '55', '65', '57', '67', '58', '59', 'SE'
    
    -- Referência
    documento_id UUID,
    chave_acesso TEXT,
    
    -- Dados do log
    nivel TEXT NOT NULL CHECK (nivel IN ('info', 'warning', 'error', 'success')),
    mensagem TEXT NOT NULL,
    detalhes JSONB,
    
    -- Erro (se houver)
    codigo_erro TEXT,
    mensagem_erro TEXT,
    stack_trace TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- NF-e
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_company ON public.nfe_emitidas(company_id);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_chave ON public.nfe_emitidas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_status ON public.nfe_emitidas(status);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_nfe ON public.nfe_itens(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_nfe ON public.nfe_eventos(nfe_id);

-- NFC-e
CREATE INDEX IF NOT EXISTS idx_nfce_emitidas_company ON public.nfce_emitidas(company_id);
CREATE INDEX IF NOT EXISTS idx_nfce_emitidas_chave ON public.nfce_emitidas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfce_emitidas_status ON public.nfce_emitidas(status);

-- SAT
CREATE INDEX IF NOT EXISTS idx_sat_cfes_company ON public.sat_cfes(company_id);
CREATE INDEX IF NOT EXISTS idx_sat_cfes_chave ON public.sat_cfes(chave_acesso);

-- CT-e
CREATE INDEX IF NOT EXISTS idx_cte_emitidos_company ON public.cte_emitidos(company_id);
CREATE INDEX IF NOT EXISTS idx_cte_emitidos_chave ON public.cte_emitidos(chave_acesso);

-- MDF-e
CREATE INDEX IF NOT EXISTS idx_mdfe_emitidos_company ON public.mdfe_emitidos(company_id);
CREATE INDEX IF NOT EXISTS idx_mdfe_emitidos_chave ON public.mdfe_emitidos(chave_acesso);

-- NFS-e
CREATE INDEX IF NOT EXISTS idx_nfse_emitidas_company ON public.nfse_emitidas(company_id);
CREATE INDEX IF NOT EXISTS idx_nfse_emitidas_numero ON public.nfse_emitidas(numero_nfse);

-- GNRE
CREATE INDEX IF NOT EXISTS idx_gnre_guias_company ON public.gnre_guias(company_id);

-- Logs
CREATE INDEX IF NOT EXISTS idx_logs_fiscais_company ON public.logs_fiscais(company_id);
CREATE INDEX IF NOT EXISTS idx_logs_fiscais_created ON public.logs_fiscais(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_fiscais_nivel ON public.logs_fiscais(nivel);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.nfe_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_cancelamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_cces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_inutilizacoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nfce_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sat_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_cfes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cte_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_os_emitidos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mdfe_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdfe_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdfe_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nfse_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_rps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_eventos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gnre_guias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_fiscais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usando função get_user_company_id que deve existir)
-- NF-e
CREATE POLICY "Users can manage NFe in their company" ON public.nfe_emitidas
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFe items in their company" ON public.nfe_itens
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFe events in their company" ON public.nfe_eventos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFe cancellations in their company" ON public.nfe_cancelamentos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFe CCe in their company" ON public.nfe_cces
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFe inutilizations in their company" ON public.nfe_inutilizacoes
    FOR ALL USING (company_id = get_user_company_id());

-- NFC-e
CREATE POLICY "Users can manage NFCe in their company" ON public.nfce_emitidas
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFCe events in their company" ON public.nfce_eventos
    FOR ALL USING (company_id = get_user_company_id());

-- SAT
CREATE POLICY "Users can manage SAT config in their company" ON public.sat_config
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage SAT CFes in their company" ON public.sat_cfes
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage SAT events in their company" ON public.sat_eventos
    FOR ALL USING (company_id = get_user_company_id());

-- CT-e
CREATE POLICY "Users can manage CTe in their company" ON public.cte_emitidos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage CTe items in their company" ON public.cte_itens
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage CTe events in their company" ON public.cte_eventos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage CTe OS in their company" ON public.cte_os_emitidos
    FOR ALL USING (company_id = get_user_company_id());

-- MDF-e
CREATE POLICY "Users can manage MDFe in their company" ON public.mdfe_emitidos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage MDFe documents in their company" ON public.mdfe_documentos
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage MDFe events in their company" ON public.mdfe_eventos
    FOR ALL USING (company_id = get_user_company_id());

-- NFS-e
CREATE POLICY "Users can manage NFSe in their company" ON public.nfse_emitidas
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFSe RPS in their company" ON public.nfse_rps
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Users can manage NFSe events in their company" ON public.nfse_eventos
    FOR ALL USING (company_id = get_user_company_id());

-- GNRE
CREATE POLICY "Users can manage GNRE in their company" ON public.gnre_guias
    FOR ALL USING (company_id = get_user_company_id());

-- Logs
CREATE POLICY "Users can view fiscal logs in their company" ON public.logs_fiscais
    FOR SELECT USING (company_id = get_user_company_id());

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

-- Função genérica para updated_at
CREATE OR REPLACE FUNCTION public.update_fiscal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER update_nfe_emitidas_updated_at BEFORE UPDATE ON public.nfe_emitidas FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_nfce_emitidas_updated_at BEFORE UPDATE ON public.nfce_emitidas FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_sat_cfes_updated_at BEFORE UPDATE ON public.sat_cfes FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_sat_config_updated_at BEFORE UPDATE ON public.sat_config FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_cte_emitidos_updated_at BEFORE UPDATE ON public.cte_emitidos FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_cte_os_emitidos_updated_at BEFORE UPDATE ON public.cte_os_emitidos FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_mdfe_emitidos_updated_at BEFORE UPDATE ON public.mdfe_emitidos FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_nfse_emitidas_updated_at BEFORE UPDATE ON public.nfse_emitidas FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();
CREATE TRIGGER update_gnre_guias_updated_at BEFORE UPDATE ON public.gnre_guias FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================

COMMENT ON TABLE public.nfe_emitidas IS 'Notas Fiscais Eletrônicas (Modelo 55) emitidas';
COMMENT ON TABLE public.nfce_emitidas IS 'Notas Fiscais de Consumidor Eletrônicas (Modelo 65) emitidas';
COMMENT ON TABLE public.sat_cfes IS 'Cupons Fiscais Eletrônicos do SAT (Modelo 59)';
COMMENT ON TABLE public.cte_emitidos IS 'Conhecimentos de Transporte Eletrônicos (Modelo 57) emitidos';
COMMENT ON TABLE public.cte_os_emitidos IS 'CT-e de Serviço (Modelo 67) emitidos';
COMMENT ON TABLE public.mdfe_emitidos IS 'Manifestos de Documentos Fiscais Eletrônicos (Modelo 58) emitidos';
COMMENT ON TABLE public.nfse_emitidas IS 'Notas Fiscais de Serviço Eletrônicas emitidas';
COMMENT ON TABLE public.gnre_guias IS 'Guias de Recolhimento (GNRE) geradas';

