# Fluxo de Separação com Divergência

## 📋 Resumo do Fluxo

Quando um pedido volta da separação com divergência (itens faltando, avariados ou separação parcial), ele é automaticamente direcionado para o vendedor realizar os ajustes necessários.

## 🔄 Fluxo Completo

### 1. Separação Identifica Divergência

**Arquivo:** `apex-auto-glass-erp/src/services/pickingService.ts`

Quando a separação é finalizada (`finishPicking`):

- **Linha 635-637**: Verifica itens faltando (`status_item === 'falta'`) ou danificados (`status_item === 'danificado'`)
- **Linha 655-660**: Define status do picking:
  - `erro_danificado` - se houver itens danificados
  - `erro_falta` - se houver itens faltando
  - `separado` - se não houver problemas
- **Linha 866-901**: Prepara detalhes dos problemas em `picking_issues` (JSONB):
  ```json
  {
    "missing": [...],    // Itens faltando
    "damaged": [...],   // Itens avariados
    "partial": [...]     // Separação parcial
  }
  ```
- **Linha 907-928**: Atualiza a venda:
  - `status_venda: 'aguardando_ajuste'` (se houver problemas)
  - `picking_issues: {...}` (detalhes dos problemas)

### 2. Vendedor Visualiza Pedido com Divergência

**Arquivo:** `apex-auto-glass-erp/src/pages/Sales.tsx`

Na lista de vendas:

- **Linha 1461-1463**: Badge laranja "Aguardando Ajuste" para vendas com esse status
- **Linha 1508-1521**: Botão de alerta laranja (ícone `AlertTriangle`) aparece quando:
  - `status_venda === 'aguardando_ajuste'`
  - `picking_issues` não é null
- **Linha 1542**: Filtro por status "Aguardando Ajuste" disponível

### 3. Vendedor Ajusta os Problemas

**Arquivo:** `apex-auto-glass-erp/src/components/sales/PickingIssuesDialog.tsx`

O diálogo mostra:

#### Itens Faltando
- **Ações disponíveis:**
  - Remover Item (padrão)
  - Manter Item (Aguardar Estoque)

#### Itens Avariados
- **Ações disponíveis:**
  - Remover Item
  - Substituir por Outro Produto (padrão)
    - Busca produtos com mesmo código de fabricante
    - Mostra estoque disponível
  - Manter Item (Aceitar Avariado)

#### Separação Parcial
- **Ação disponível:**
  - Ajustar Quantidade
    - Permite definir quantidade final (0 a quantidade solicitada)
    - Se quantidade = 0, remove o item

### 4. Aplicação dos Ajustes

**Linha 121-258** do `PickingIssuesDialog.tsx`:

1. Processa cada ajuste definido pelo vendedor
2. Atualiza ou remove `sale_items` conforme necessário
3. Recalcula total da venda (subtotal e total)
4. Limpa `picking_issues` (define como `null`)
5. Atualiza `status_venda` para `'aguardando_separacao'` (linha 234)
6. Pedido volta para separação com os ajustes aplicados

## ✅ Funcionalidades Implementadas

- ✅ Detecção automática de divergências na separação
- ✅ Status `aguardando_ajuste` para pedidos com problemas
- ✅ Badge visual na lista de vendas
- ✅ Botão de alerta para acessar ajustes
- ✅ Diálogo completo de ajustes com todas as opções
- ✅ Filtro por status "Aguardando Ajuste"
- ✅ Recalculo automático de totais após ajustes
- ✅ Retorno automático para separação após ajustes

## 🔍 Como Verificar

1. **Na página de Vendas:**
   - Procure por vendas com badge "Aguardando Ajuste"
   - Ou use o filtro de status "Aguardando Ajuste"
   - Clique no botão de alerta laranja (⚠️) para abrir o diálogo

2. **No diálogo de ajustes:**
   - Revise todos os problemas (faltando, avariados, parciais)
   - Defina a ação para cada item
   - Clique em "Aplicar Ajustes"
   - O pedido voltará automaticamente para separação

## 📝 Observações

- O sistema salva o `seller_id` na venda, então é possível identificar qual vendedor criou o pedido
- Atualmente não há filtro automático por vendedor, mas o `seller_id` está disponível para implementação futura
- Após os ajustes, o pedido volta para `aguardando_separacao` e pode ser separado novamente

## 🎯 Status da Venda

Fluxo de status:
```
aguardando_separacao → em_separacao → separado/erro_falta/erro_danificado
                                                      ↓
                                            aguardando_ajuste
                                                      ↓
                                            aguardando_separacao (após ajustes)
```

