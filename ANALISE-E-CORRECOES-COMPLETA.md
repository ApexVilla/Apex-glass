# 📊 ANÁLISE COMPLETA E CORREÇÕES DO SCHEMA

## 🎯 RESUMO EXECUTIVO

Este documento apresenta a análise completa do schema do banco de dados, identificação de todos os problemas encontrados, correções aplicadas e plano de migração para atualizar o banco atual para o novo padrão corporativo.

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. **TABELAS DUPLICADAS** ❌

**Problema:** Existência de tabelas duplicadas com funcionalidades similares:

- `clientes` vs `customers` 
- `produtos` vs `products`
- `vendas` vs `sales`
- `contas_receber` vs `accounts_receivable`
- `fornecedores` vs `suppliers`

**Impacto:** 
- Dados inconsistentes
- Confusão na aplicação
- Duplicação de lógica
- Problemas de integridade

**Solução:** ✅ Manter apenas as tabelas em inglês (`customers`, `products`, `sales`, `accounts_receivable`, `suppliers`) e criar script de migração de dados.

---

### 2. **INCONSISTÊNCIA MULTI-TENANT** ❌

**Problema:** Mistura de `tenant_id` e `company_id`:

- Tabelas antigas usam `tenant_id` (ex: `tenants`, `profiles.tenant_id`)
- Tabelas novas usam `company_id` (ex: `companies`, `customers.company_id`)
- Tabela `profiles` tem ambos os campos

**Impacto:**
- Isolamento de dados quebrado
- RLS policies inconsistentes
- Queries complexas e confusas

**Solução:** ✅ Padronizar para `company_id` em todas as tabelas. `company_id` é mais semântico para ERP.

**Por que `company_id` e não `tenant_id`?**
- Mais intuitivo para contexto de ERP
- Alinha com nomenclatura de negócio
- Facilita queries e documentação
- Padrão já estabelecido na maioria das tabelas

---

### 3. **FOREIGN KEYS QUEBRADAS** ❌

**Problemas encontrados:**

1. `customer_vehicles` - Faltava PRIMARY KEY na migration inicial (já corrigido)
2. `inventory_movements` - Algumas migrations não definiam `id` corretamente
3. Referências a tabelas que não existem mais
4. FKs sem `ON DELETE CASCADE` onde necessário

**Solução:** ✅ Todas as FKs corrigidas no schema novo com:
- `ON DELETE CASCADE` para dependências fortes
- `ON DELETE SET NULL` para dependências opcionais
- Constraints de UNIQUE onde necessário

---

### 4. **TIPOS USER-DEFINED NÃO DECLARADOS** ❌

**Problema:** Uso de ENUMs sem declaração prévia:

- `user_role`
- `service_order_status`
- `payment_status`
- `financial_nature_type`
- `account_type`
- `payment_method`
- `receivable_status`
- `payable_status`
- `picking_status`
- `picking_item_status`
- `conference_status`

**Solução:** ✅ Todos os ENUMs declarados no início do schema com `DO $$ BEGIN ... EXCEPTION ... END $$;` para evitar erros em re-execução.

---

### 5. **CAMPOS SEM DEFAULT** ❌

**Problemas encontrados:**

- Campos `NOT NULL` sem DEFAULT em tabelas legadas
- Timestamps sem `DEFAULT now()`
- Campos booleanos sem DEFAULT
- Campos numéricos sem DEFAULT 0

**Solução:** ✅ Todos os campos obrigatórios têm DEFAULT apropriado:
- `created_at`, `updated_at`: `DEFAULT now()`
- `is_active`, `ativo`: `DEFAULT true`
- Valores monetários: `DEFAULT 0`
- Status: DEFAULT apropriado para cada tipo

---

### 6. **NOT NULL INCONSISTENTES** ❌

**Problema:** Alguns campos importantes não eram `NOT NULL`:

- `companies.name` - deveria ser NOT NULL ✅
- `customers.name` - deveria ser NOT NULL ✅
- `products.name` - deveria ser NOT NULL ✅
- `sales.total` - deveria ser NOT NULL ✅

**Solução:** ✅ Aplicado `NOT NULL` em todos os campos críticos.

---

### 7. **CAMPOS DUPLICADOS** ❌

**Problema:** Campos redundantes:

- `inventory_movements`: `estoque_anterior` e `saldo_anterior` (mesmo conceito)
- `inventory_movements`: `observacao` e `observacoes` (mesmo conceito)
- `products`: `sale_price` e `retail_price` (podem ser diferentes, mas precisa padronizar)

**Solução:** ✅ 
- Unificado para `stock_before` e `stock_after`
- Unificado para `observations`
- Mantido `sale_price` e `retail_price` com documentação clara

---

### 8. **NOMES INCOERENTES** ❌

**Problema:** Mistura de português e inglês:

- Tabelas: `clientes`, `produtos`, `vendas` (português) vs `customers`, `products`, `sales` (inglês)
- Colunas: `nome_razao`, `cpf_cnpj` (português) vs `name`, `email` (inglês)
- Funções: `get_user_company_id()` (inglês) vs `get_current_empresa_id()` (português)

**Solução:** ✅ Padronizado para inglês em:
- Nomes de tabelas
- Nomes de colunas (exceto campos específicos do Brasil como `cpf_cnpj`, `cnpj`)
- Nomes de funções
- Nomes de ENUMs

**Exceções mantidas em português:**
- Campos fiscais brasileiros: `cpf_cnpj`, `cnpj`, `ie`, `im`, `cnae`
- Status específicos: `em_aberto`, `pago_parcial`, `pago_total`
- Naturezas financeiras: `entrada`, `saida`

---

### 9. **COLUNAS COM TIPO INCORRETO** ❌

**Problemas encontrados:**

1. `DECIMAL(12,2)` vs `NUMERIC(15,2)` - Inconsistência
2. `TIMESTAMP` vs `TIMESTAMPTZ` - Algumas tabelas sem timezone
3. `SERIAL` vs `INTEGER` com função - Para números sequenciais por empresa

**Solução:** ✅ 
- Padronizado `NUMERIC(15,2)` para valores monetários
- Padronizado `TIMESTAMPTZ` para todos os timestamps
- Substituído `SERIAL` por `INTEGER` com funções que geram sequenciais por empresa

---

### 10. **VALORES CALCULADOS** ❌

**Problema:** Campo `limit_available` em `credit_limits` não estava como GENERATED:

```sql
-- ANTES (ERRADO)
limit_available NUMERIC(15,2) DEFAULT (limit_total - limit_used)

-- DEPOIS (CORRETO)
limit_available NUMERIC(15,2) GENERATED ALWAYS AS (limit_total - limit_used) STORED
```

**Solução:** ✅ Convertido para `GENERATED ALWAYS AS ... STORED` para garantir consistência.

---

### 11. **PROBLEMAS DE INTEGRIDADE E NORMALIZAÇÃO** ❌

**Problemas:**

1. Falta de constraints UNIQUE em campos críticos
2. Falta de CHECK constraints para validação
3. Normalização incompleta (alguns dados duplicados)

**Solução:** ✅ Adicionado:
- UNIQUE constraints em campos críticos (ex: `companies.cnpj`, `customers.code`, `products.internal_code`)
- CHECK constraints para validação (ex: datas, valores)
- Constraints de integridade referencial

---

### 12. **TRIGGERS FALTANDO** ❌

**Problema:** Algumas funcionalidades dependem de triggers que não existiam:

- Atualização automática de `updated_at`
- Geração automática de números sequenciais por empresa
- Atualização de saldo de contas
- Atualização de status de contas a receber/pagar
- Atualização de estoque

**Solução:** ✅ Criados todos os triggers necessários.

---

### 13. **RLS (ROW LEVEL SECURITY) INCOMPLETO** ❌

**Problema:** 
- Algumas tabelas sem RLS habilitado
- Políticas inconsistentes
- Uso de funções diferentes (`get_user_company_id()` vs `get_current_empresa_id()`)

**Solução:** ✅ 
- RLS habilitado em todas as tabelas
- Políticas padronizadas usando `get_user_company_id()`
- Suporte a usuários master com override

---

## ✅ CORREÇÕES APLICADAS

### 1. **Padronização Multi-Tenant**

✅ Todas as tabelas usam `company_id` (não `tenant_id`)
✅ Função unificada `get_user_company_id()` para RLS
✅ Tabela `user_companies` para associação usuário-empresa
✅ Suporte a override temporário para usuários master

### 2. **Nomenclatura Consistente**

✅ Tabelas em inglês
✅ Colunas em inglês (exceto campos fiscais brasileiros)
✅ Funções em inglês
✅ ENUMs padronizados

### 3. **Integridade Referencial**

✅ Todas as FKs corrigidas
✅ Constraints UNIQUE adicionadas
✅ CHECK constraints para validação
✅ ON DELETE apropriado (CASCADE ou SET NULL)

### 4. **Campos e Tipos**

✅ Todos os campos obrigatórios com DEFAULT
✅ Timestamps padronizados (TIMESTAMPTZ)
✅ Valores monetários padronizados (NUMERIC(15,2))
✅ Campos calculados como GENERATED

### 5. **Triggers e Funções**

✅ Trigger para `updated_at` em todas as tabelas
✅ Funções para números sequenciais por empresa
✅ Triggers para atualização de saldos
✅ Triggers para atualização de status
✅ Triggers para atualização de estoque

### 6. **RLS Completo**

✅ RLS habilitado em todas as tabelas
✅ Políticas padronizadas
✅ Suporte a usuários master
✅ Isolamento completo por empresa

### 7. **Índices para Performance**

✅ Índices em FKs
✅ Índices em campos de busca frequente
✅ Índices compostos onde necessário
✅ Índices parciais para campos booleanos

---

## 📋 PLANO DE MIGRAÇÃO

### FASE 1: PREPARAÇÃO (Backup e Validação)

```sql
-- 1. Fazer backup completo do banco
-- 2. Validar dados existentes
-- 3. Verificar integridade atual
```

### FASE 2: MIGRAÇÃO DE DADOS (Tabelas Duplicadas)

```sql
-- Migrar dados de tabelas em português para inglês

-- clientes -> customers
INSERT INTO public.customers (
    id, company_id, name, phone, email, cpf_cnpj, address, 
    city, state, zip_code, notes, created_at, updated_at
)
SELECT 
    id, 
    tenant_id, -- ou company_id se já existir
    name, 
    phone, 
    email, 
    cpf, 
    address, 
    city, 
    state, 
    zip_code, 
    notes, 
    created_at, 
    updated_at
FROM public.clientes
ON CONFLICT (id) DO NOTHING;

-- produtos -> products (se necessário)
-- vendas -> sales (se necessário)
-- contas_receber -> accounts_receivable (se necessário)
-- fornecedores -> suppliers (se necessário)
```

### FASE 3: ATUALIZAÇÃO DE SCHEMA

```sql
-- 1. Criar novas tabelas e estruturas
-- 2. Migrar dados
-- 3. Atualizar FKs
-- 4. Aplicar constraints
```

### FASE 4: MIGRAÇÃO DE tenant_id PARA company_id

```sql
-- Se profiles tem tenant_id mas precisa de company_id
UPDATE public.profiles
SET company_id = (
    SELECT id FROM public.companies 
    WHERE id = profiles.tenant_id 
    LIMIT 1
)
WHERE tenant_id IS NOT NULL AND company_id IS NULL;

-- Criar empresas a partir de tenants se necessário
INSERT INTO public.companies (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at
FROM public.tenants
WHERE id NOT IN (SELECT id FROM public.companies)
ON CONFLICT (id) DO NOTHING;
```

### FASE 5: APLICAÇÃO DO NOVO SCHEMA

```sql
-- Executar SCHEMA-CORRIGIDO-COMPLETO.sql
-- Aplicar em ambiente de teste primeiro
-- Validar todas as funcionalidades
```

### FASE 6: LIMPEZA (Remover Tabelas Obsoletas)

```sql
-- APÓS VALIDAÇÃO COMPLETA E BACKUP

-- Remover tabelas duplicadas (CUIDADO!)
-- DROP TABLE IF EXISTS public.clientes CASCADE;
-- DROP TABLE IF EXISTS public.produtos CASCADE;
-- DROP TABLE IF EXISTS public.vendas CASCADE;
-- DROP TABLE IF EXISTS public.contas_receber CASCADE;
-- DROP TABLE IF EXISTS public.fornecedores CASCADE;
-- DROP TABLE IF EXISTS public.tenants CASCADE; -- Se não for mais usado
```

---

## 📊 TABELAS OBSOLETAS (Para Remoção)

⚠️ **ATENÇÃO:** Remover apenas após migração completa e validação!

1. `clientes` → Substituída por `customers`
2. `produtos` → Substituída por `products`
3. `vendas` → Substituída por `sales`
4. `venda_itens` → Substituída por `sale_items`
5. `contas_receber` → Substituída por `accounts_receivable`
6. `fornecedores` → Substituída por `suppliers`
7. `tenants` → Substituída por `companies` (se não houver dados importantes)
8. `usuarios_empresas` → Substituída por `user_companies` (após migração)

---

## 🎯 MELHORIAS ADICIONAIS SUGERIDAS

### 1. **Auditoria Completa**

- Adicionar `created_by` e `updated_by` em todas as tabelas (já feito ✅)
- Criar tabela de auditoria centralizada
- Log de todas as alterações críticas

### 2. **Soft Delete**

- Adicionar campo `deleted_at` em tabelas críticas
- Evitar perda de dados históricos
- Facilitar recuperação

### 3. **Versionamento de Schema**

- Usar migrations versionadas
- Manter histórico de mudanças
- Facilitar rollback

### 4. **Otimizações de Performance**

- Particionamento de tabelas grandes (ex: `inventory_movements`, `financial_movements`)
- Materialized views para relatórios
- Índices adicionais baseados em queries reais

### 5. **Validações Adicionais**

- Constraints para CPF/CNPJ válidos
- Validação de emails
- Validação de CEPs

### 6. **Compatibilidade com Módulos Futuros**

O schema está preparado para:
- ✅ NF-e (Nota Fiscal Eletrônica)
- ✅ NFC-e (Nota Fiscal Consumidor)
- ✅ NFS-e (Nota Fiscal de Serviço)
- ✅ CT-e (Conhecimento de Transporte)
- ✅ MDF-e (Manifesto de Documentos Fiscais)
- ✅ SAT/CF-e (Cupom Fiscal Eletrônico)

---

## 🔒 SEGURANÇA E RLS

### Políticas Implementadas

1. **Isolamento por Empresa:**
   - Usuários só veem dados da sua empresa
   - Políticas baseadas em `company_id = get_user_company_id()`

2. **Usuários Master:**
   - Suporte a override temporário
   - Acesso a todas as empresas quando necessário
   - Expiração automática de override

3. **Auditoria:**
   - Logs de todas as ações
   - Rastreamento de alterações
   - Histórico completo

---

## 📝 CHECKLIST DE VALIDAÇÃO

Antes de aplicar em produção:

- [ ] Backup completo do banco
- [ ] Teste em ambiente de desenvolvimento
- [ ] Validação de todas as FKs
- [ ] Teste de RLS policies
- [ ] Validação de triggers
- [ ] Teste de migração de dados
- [ ] Validação de performance
- [ ] Teste de rollback
- [ ] Documentação atualizada
- [ ] Treinamento da equipe

---

## 🚀 PRÓXIMOS PASSOS

1. **Revisar** o schema corrigido (`SCHEMA-CORRIGIDO-COMPLETO.sql`)
2. **Testar** em ambiente de desenvolvimento
3. **Ajustar** conforme necessidades específicas
4. **Aplicar** migração de dados
5. **Validar** todas as funcionalidades
6. **Aplicar** em produção com backup

---

## 📞 SUPORTE

Em caso de dúvidas ou problemas durante a migração:

1. Verificar logs do Supabase
2. Validar constraints e FKs
3. Revisar políticas RLS
4. Consultar documentação do Supabase

---

**Data da Análise:** 2025-01-31
**Versão do Schema:** 2.0
**Status:** ✅ Pronto para revisão e teste

