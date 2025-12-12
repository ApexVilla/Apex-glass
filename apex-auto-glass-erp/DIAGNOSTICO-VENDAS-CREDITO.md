# Diagnóstico: Vendas não aparecem no Painel de Análise de Crédito

## Passos para Diagnosticar

### 1. Verificar se a migração foi aplicada

Execute no Supabase SQL Editor:

```sql
-- Verificar se a coluna credit_status existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name = 'credit_status';
```

**Se não retornar nada**: A migração ainda não foi aplicada. Execute o arquivo:
`supabase/migrations/20251226000000_create_credit_analysis_system.sql`

### 2. Verificar se há vendas que deveriam aparecer

```sql
-- Verificar vendas com formas de pagamento que exigem crédito
SELECT 
  sale_number,
  payment_method,
  credit_status,
  status_codes,
  total,
  created_at
FROM public.sales
WHERE payment_method IS NOT NULL
  AND (
    LOWER(TRIM(payment_method)) LIKE '%boleto%'
    OR LOWER(TRIM(payment_method)) LIKE '%cartão a prazo%'
    OR LOWER(TRIM(payment_method)) LIKE '%cartao a prazo%'
    OR LOWER(TRIM(payment_method)) LIKE '%credito interno%'
    OR LOWER(TRIM(payment_method)) LIKE '%crédito interno%'
    OR LOWER(TRIM(payment_method)) LIKE '%duplicata%'
    OR LOWER(TRIM(payment_method)) LIKE '%cheque%'
    OR LOWER(TRIM(payment_method)) LIKE '%prazo%'
    OR LOWER(TRIM(payment_method)) LIKE '%parcelado%'
    OR LOWER(TRIM(payment_method)) = 'credito_loja'
    OR LOWER(TRIM(payment_method)) = 'credito loja'
  )
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Atualizar vendas existentes

Se a migração foi aplicada mas as vendas antigas não têm `credit_status`, execute:

```sql
-- Arquivo: ATUALIZAR-VENDAS-EXISTENTES-CREDITO.sql
```

### 4. Verificar se o trigger está funcionando

```sql
-- Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_apply_credit_status';
```

### 5. Testar criando uma nova venda

1. Crie uma nova venda com forma de pagamento "Boleto" ou "Cartão a prazo"
2. Verifique se o `credit_status` foi definido automaticamente como 'pending'
3. Verifique se o status 'C' foi adicionado ao array `status_codes`

### 6. Verificar no console do navegador

Abra o console do navegador (F12) e verifique se há erros ao carregar o painel de análise de crédito.

## Soluções Comuns

### Problema: Migração não aplicada
**Solução**: Execute a migração `20251226000000_create_credit_analysis_system.sql` no Supabase Dashboard

### Problema: Vendas antigas sem credit_status
**Solução**: Execute o script `ATUALIZAR-VENDAS-EXISTENTES-CREDITO.sql`

### Problema: Trigger não está funcionando
**Solução**: Verifique se a função `apply_credit_status_if_needed()` existe e está correta

### Problema: Forma de pagamento não está sendo reconhecida
**Solução**: Verifique se a forma de pagamento está exatamente como definida na função `requires_credit_analysis`

## Formas de Pagamento que Exigem Análise

- Boleto
- Cartão a prazo
- Cartão a prazo parcelado
- Crédito interno
- Crédito loja
- Duplicata
- Cheque
- Prazo
- Parcelado
- Parcelamento

Qualquer variação desses nomes (case-insensitive) também será reconhecida.

