# Correção: Baixa Automática de Estoque na Separação

## ✅ Problema Resolvido

O estoque não estava sendo baixado automaticamente após finalizar a separação de itens.

## 🔧 Correções Aplicadas

### 1. Migration SQL (`20250201000000_fix_picking_stock_deduction.sql`)

**Função `create_inventory_movement`:**
- ✅ Corrigida para que `saida_separacao` baixe estoque automaticamente
- ✅ Adicionada validação de estoque antes de criar movimentação
- ✅ Todos os tipos de saída (`saida_venda`, `saida_separacao`, `saida_manual`, etc.) agora baixam estoque

**Função `calculate_stock_balance_before`:**
- ✅ Atualizada para considerar `saida_separacao` no cálculo de saldo
- ✅ Agora `saida_separacao` é incluída no cálculo de estoque

**Função `update_movement_balances`:**
- ✅ Atualizada para que `saida_separacao` altere o saldo (baixe estoque)

### 2. Serviço de Picking (`pickingService.ts`)

**Função `finishPicking`:**
- ✅ Adicionada validação de estoque ANTES de finalizar a separação
- ✅ Verifica se há estoque suficiente para todos os itens que serão separados
- ✅ Sempre cria movimentações do tipo `saida_separacao` que agora baixam estoque automaticamente
- ✅ Remove status "E" (pendência de estoque) após separação concluída
- ✅ Verifica se o estoque foi realmente baixado após criar as movimentações

**Função `markAsSeparated`:**
- ✅ Validação de estoque antes de permitir separar
- ✅ Não permite separar mais do que foi solicitado
- ✅ Mensagens de erro mais claras com estoque disponível vs solicitado

**Função `partialPicking`:**
- ✅ Validação de quantidade (deve ser > 0 e <= quantidade solicitada)
- ✅ Validação de estoque antes de permitir separação parcial
- ✅ Mensagens de erro mais claras

## 📋 Fluxo Corrigido

### Ao Finalizar Separação:

1. **Validação de Estoque** (NOVO)
   - Verifica se todos os produtos têm estoque suficiente
   - Impede finalização se houver estoque insuficiente
   - Mostra mensagem clara com estoque disponível vs solicitado

2. **Criação de Movimentações**
   - Cria movimentações do tipo `saida_separacao` para cada item separado
   - A função `create_inventory_movement` baixa o estoque automaticamente
   - Registra saldo anterior e posterior

3. **Atualização de Estoque**
   - Estoque é baixado automaticamente na tabela `products`
   - Quantidade atual é atualizada: `quantity = quantity - quantidade_separada`

4. **Validação Pós-Baixa** (NOVO)
   - Verifica se o estoque foi realmente atualizado
   - Logs detalhados para debug

5. **Atualização de Status**
   - Picking marcado como "separado"
   - Venda atualizada para status apropriado
   - Status "E" (pendência de estoque) removido

## 🛡️ Validações Implementadas

### Antes de Separar Item:
- ✅ Verifica se há estoque suficiente
- ✅ Não permite separar mais do que foi solicitado
- ✅ Mensagens de erro claras

### Antes de Finalizar Separação:
- ✅ Verifica estoque para todos os itens que serão separados
- ✅ Impede finalização se houver qualquer item sem estoque
- ✅ Validação ocorre ANTES de criar qualquer movimentação

### Após Finalizar Separação:
- ✅ Verifica se o estoque foi realmente baixado
- ✅ Logs detalhados para auditoria

## 📝 Como Aplicar

1. **Aplicar a Migration:**
   ```sql
   -- Execute a migration no Supabase
   -- Arquivo: supabase/migrations/20250201000000_fix_picking_stock_deduction.sql
   ```

2. **O código TypeScript já está atualizado:**
   - `src/services/pickingService.ts` já contém todas as correções

## ✅ Resultado Esperado

Após aplicar as correções:

1. ✅ O estoque é baixado automaticamente ao finalizar a separação
2. ✅ Não é possível finalizar separação sem estoque suficiente
3. ✅ Não é possível separar mais do que tem no estoque
4. ✅ Movimentações de estoque são criadas corretamente
5. ✅ Estoque atual é atualizado no banco de dados
6. ✅ Separação é marcada como "Concluída" ou "Liberada"
7. ✅ Pedido/venda é atualizado com status correto

## 🔍 Verificação

Para verificar se está funcionando:

1. Crie uma venda com itens
2. Inicie a separação
3. Finalize a separação
4. Verifique:
   - O estoque dos produtos foi reduzido
   - Existe movimentação de estoque do tipo `saida_separacao`
   - O status da separação foi atualizado
   - O status da venda foi atualizado

## 📌 Notas Importantes

- A função `create_inventory_movement` agora valida estoque antes de criar movimentação
- O tipo `saida_separacao` agora baixa estoque automaticamente (antes não baixava)
- Todas as validações ocorrem ANTES de fazer qualquer alteração no banco
- Mensagens de erro são claras e informativas

