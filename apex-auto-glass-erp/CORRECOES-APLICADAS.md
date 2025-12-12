# Correções Aplicadas - Erros Supabase

## Problemas Identificados e Corrigidos

### 1. ✅ Tabelas Faltantes (404)
- **Problema**: Tabelas `service_orders` e `financial_transactions` não existiam no banco
- **Solução**: Criadas as tabelas com todas as colunas necessárias e políticas RLS

### 2. ✅ Relacionamento profiles ↔ user_roles (400)
- **Problema**: Erro "Could not find a relationship between 'profiles' and 'user_roles'"
- **Solução**: 
  - Adicionada foreign key `user_roles.user_id → profiles.id`
  - Criada função SQL `get_users_with_roles()` para buscar usuários com roles
  - Atualizado `rbacService.ts` para usar a nova função

### 3. ✅ Query de Produtos com Estoque Baixo (400)
- **Problema**: Query `quantity=lte.min_quantity` com sintaxe incorreta (comparação entre colunas)
- **Solução**: 
  - Criada função SQL `get_low_stock_products()` 
  - Atualizado `Dashboard.tsx` para usar a função RPC

### 4. ✅ Políticas RLS
- Criadas políticas RLS para `service_orders` e `financial_transactions`
- Políticas garantem que usuários só vejam dados de sua empresa

## Migrações Aplicadas

1. `fix_missing_tables_and_relationships` - Cria tabelas faltantes e FK
2. `add_low_stock_function` - Função para produtos com estoque baixo
3. `add_get_users_with_roles_function_fixed` - Função para buscar usuários com roles

## Arquivos Modificados

1. `src/pages/Dashboard.tsx` - Corrigida query de produtos e adicionado `company` do useAuth
2. `src/services/rbacService.ts` - Atualizado para usar função SQL ao invés de join direto

## Próximos Passos

1. Testar o carregamento de usuários na página de Usuários
2. Verificar se o Dashboard carrega corretamente
3. Testar as queries de service_orders e financial_transactions

