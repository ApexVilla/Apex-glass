# 🔧 Correção: Sequências Separadas por Empresa

## 📋 Problema Identificado

O sistema estava usando `SERIAL` para gerar números de vendas, pedidos e notas fiscais. Isso criava uma **sequência global compartilhada** entre todas as empresas, causando:

1. **Vendas misturadas**: Apexvilla criava venda #1, TM Parabrisa criava venda #2 (deveria ser #1 para TM)
2. **Pedidos misturados**: Mesmo problema com números de pedidos
3. **Notas fiscais misturadas**: Mesmo problema com números de notas

### Exemplo do Problema:
- **Apexvilla** cria: Venda #1, #2, #3
- **TM Parabrisa** cria: Venda #4, #5, #6 ❌ (deveria ser #1, #2, #3)

## ✅ Solução Implementada

Criada migração que:

1. **Remove sequências globais** (`SERIAL`)
2. **Cria funções** que geram números sequenciais **por empresa**
3. **Cria triggers** que aplicam automaticamente os números corretos

### Como Funciona Agora:

- **Apexvilla**: Venda #1, #2, #3... (sequência própria)
- **TM Parabrisa**: Venda #1, #2, #3... (sequência própria)
- Cada empresa tem sua própria numeração independente

## 📁 Arquivos Criados

1. **`supabase/migrations/20251228000000_fix_sequences_per_company.sql`**
   - Migração principal que corrige o problema

2. **`INVESTIGAR-VENDA-18.sql`**
   - Script para investigar a venda #18 e verificar o problema

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de `20251228000000_fix_sequences_per_company.sql`
4. Execute o script

### Opção 2: Via Supabase CLI
```bash
cd apex-auto-glass-erp
supabase db push
```

## 🔍 Verificar se Funcionou

Execute o script `INVESTIGAR-VENDA-18.sql` para verificar:

1. Qual empresa tem a venda #18
2. Se há vendas com números duplicados entre empresas
3. Status das sequências por empresa

## 📊 O que Foi Corrigido

### ✅ Vendas (`sales.sale_number`)
- Função: `get_next_sale_number(company_id)`
- Trigger: `set_sale_number_trigger`

### ✅ Pedidos (`service_orders.order_number`)
- Função: `get_next_order_number(company_id)`
- Trigger: `set_order_number_trigger`

### ✅ Notas Fiscais (`invoices.invoice_number`)
- Função: `get_next_invoice_number(company_id)`
- Trigger: `set_invoice_number_trigger`

## ⚠️ Importante

- **Vendas existentes**: Os números antigos serão mantidos, mas novas vendas usarão sequências separadas
- **Não há perda de dados**: Apenas a forma de gerar novos números foi alterada
- **Compatibilidade**: O código existente continua funcionando normalmente

## 🐛 Sobre a Venda #18

Para investigar especificamente a venda #18 da TM Parabrisa que apareceu na Apexvilla:

1. Execute `INVESTIGAR-VENDA-18.sql`
2. Verifique qual empresa realmente possui a venda #18
3. Se estiver na empresa errada, pode ser necessário:
   - Verificar RLS (Row Level Security)
   - Verificar se o `company_id` está correto na venda

## 📝 Notas Técnicas

- As funções usam `SECURITY DEFINER` para garantir acesso
- Os triggers são executados **antes** de inserir (`BEFORE INSERT`)
- Se um número for fornecido manualmente, ele será respeitado
- Se não for fornecido, será gerado automaticamente baseado na empresa







