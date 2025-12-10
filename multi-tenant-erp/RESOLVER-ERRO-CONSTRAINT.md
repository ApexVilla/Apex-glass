# 🔧 Resolver Erro: "relation already exists"

## ❌ Erro

```
ERROR: 42P07: relation "unique_tenant_numero" already exists
```

## 🔍 Causa

Isso acontece quando:
- O schema foi executado parcialmente antes
- Algumas constraints/tabelas já existem
- Tentando criar novamente algo que já existe

## ✅ Solução: Use o Arquivo `schema_final.sql`

Criei um arquivo que **remove tudo primeiro** e depois recria:

### **Passo a Passo:**

1. **Acesse:** Supabase Dashboard → SQL Editor

2. **Abra o arquivo:** `db/schema_final.sql`

3. **Copie TODO o conteúdo:**
   - `Ctrl+A` (selecionar tudo)
   - `Ctrl+C` (copiar)

4. **Cole no SQL Editor:**
   - `Ctrl+V`
   - **Verifique** que começa com `--` ou `DROP` (não com `REATE`)

5. **Execute:** Clique em **Run**

### **O que este script faz:**

1. ✅ **Remove todas as policies** (se existirem)
2. ✅ **Remove todos os triggers** (se existirem)
3. ✅ **Remove todas as funções** (se existirem)
4. ✅ **Remove todas as tabelas** (se existirem)
5. ✅ **Recria tudo do zero** de forma limpa

### **⚠️ ATENÇÃO:**

Este script **apaga todos os dados existentes**!

Se você tem dados importantes:
- Faça backup primeiro
- Ou use o script `fix_schema.sql` que preserva dados

## 🎯 Verificação

Depois de executar, verifique:

```sql
-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'profiles', 'produtos', 'fornecedores', 'vendas', 'venda_itens', 'contas_receber')
ORDER BY table_name;
```

Deve retornar 7 tabelas.

## 📝 Alternativa: Remover Apenas a Constraint

Se você não quer apagar tudo, pode remover apenas a constraint problemática:

```sql
-- Remover constraint específica
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS unique_tenant_numero;
ALTER TABLE public.contas_receber DROP CONSTRAINT IF EXISTS unique_tenant_numero;

-- Depois recriar
ALTER TABLE public.vendas ADD CONSTRAINT unique_tenant_numero UNIQUE (tenant_id, numero);
ALTER TABLE public.contas_receber ADD CONSTRAINT unique_tenant_numero UNIQUE (tenant_id, numero);
```

Mas é mais fácil usar o `schema_final.sql` que faz tudo automaticamente.

---

**Use `db/schema_final.sql` - ele resolve todos os problemas de uma vez!** ✅

