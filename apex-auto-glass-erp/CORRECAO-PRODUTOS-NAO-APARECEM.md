# Correção: Produtos Não Estão Aparecendo

## Problema Identificado

Os produtos cadastrados na Apex não estavam aparecendo na aplicação. Possíveis causas:

1. **Filtro `is_active = true` muito restritivo** - Produtos com `is_active = false` ou `NULL` não apareciam
2. **Políticas RLS bloqueando acesso** - Possível problema com filtro por `company_id`
3. **Produtos sem `company_id` definido** - Produtos órfãos não aparecem

## Correções Aplicadas

### 1. Código Frontend

#### `ProductConsultation.tsx`
- ✅ Removido filtro restritivo `is_active = true`
- ✅ Adicionado filtro que permite produtos ativos OU sem `is_active` definido
- ✅ Adicionados logs de debug para diagnóstico

#### `Inventory.tsx`
- ✅ Removido qualquer filtro por `is_active`
- ✅ Adicionados logs de debug para verificar produtos retornados

#### `Sales.tsx`
- ✅ Removido filtro `is_active = true`
- ✅ Adicionado filtro client-side para produtos ativos ou sem status

### 2. Scripts SQL Criados

#### `DIAGNOSTICO-PRODUTOS-NAO-APARECEM.sql`
Script de diagnóstico para verificar:
- Total de produtos no banco
- Produtos por status `is_active`
- Produtos por `company_id`
- Verificação de políticas RLS
- Produtos com dados corrompidos

#### `supabase/migrations/20250131000001_fix_products_visibility.sql`
Migração para corrigir:
- Políticas RLS da tabela `products`
- Garantir que produtos tenham `is_active = true` se for `NULL`
- Recriar políticas de forma mais permissiva

## Próximos Passos

### 1. Executar Diagnóstico

No Supabase SQL Editor, execute o script de diagnóstico:

```sql
-- Copie e cole o conteúdo de DIAGNOSTICO-PRODUTOS-NAO-APARECEM.sql
```

Isso mostrará:
- Quantos produtos existem no total
- Quantos estão ativos/inativos
- Se há produtos sem `company_id`
- Se o RLS está funcionando

### 2. Aplicar Correção RLS (se necessário)

Se o diagnóstico mostrar problemas com RLS, execute a migração:

```sql
-- Copie e cole o conteúdo de 
-- supabase/migrations/20250131000001_fix_products_visibility.sql
```

### 3. Verificar no Console do Navegador

Após recarregar a aplicação, verifique o console do navegador (F12) para ver os logs:

```
🔍 ProductConsultation - Total produtos encontrados: X
🔍 ProductConsultation - Produtos ativos: X
🔍 ProductConsultation - Produtos inativos: X
🔍 Inventory - Total produtos encontrados: X
✅ Inventory - Produtos retornados na página: X de Y total
```

### 4. Ativar Produtos Inativos (se necessário)

Se houver produtos inativos que deveriam aparecer, execute:

```sql
UPDATE public.products
SET is_active = true
WHERE is_active = false OR is_active IS NULL;
```

**⚠️ ATENÇÃO**: Isso ativará TODOS os produtos. Use apenas se tiver certeza.

## Verificações Adicionais

### Verificar se produtos têm `company_id`

```sql
SELECT 
    company_id,
    COUNT(*) as quantidade
FROM public.products
GROUP BY company_id;
```

Se houver produtos sem `company_id`, eles não aparecerão devido ao RLS.

### Verificar `company_id` do usuário logado

```sql
SELECT 
    auth.uid() as user_id,
    public.get_user_company_id() as company_id;
```

O `company_id` retornado deve corresponder ao `company_id` dos produtos que você quer ver.

## Solução Rápida (Temporária)

Se você precisar que TODOS os produtos apareçam imediatamente:

1. No Supabase, execute:
```sql
UPDATE public.products
SET is_active = true
WHERE is_active IS NULL OR is_active = false;
```

2. Recarregue a aplicação

3. Os produtos devem aparecer agora

## Notas

- Os logs de debug foram adicionados temporariamente e podem ser removidos após confirmar que tudo está funcionando
- As políticas RLS foram ajustadas para serem mais permissivas, mas ainda mantêm o isolamento por empresa
- Se o problema persistir, verifique se há produtos sem `company_id` ou se o usuário logado não tem `company_id` definido no `profiles`

## Suporte

Se após seguir estes passos os produtos ainda não aparecerem:
1. Execute o script de diagnóstico e compartilhe os resultados
2. Verifique os logs do console do navegador
3. Verifique se o usuário tem `company_id` definido no perfil

