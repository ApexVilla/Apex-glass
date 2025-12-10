# 🔧 SOLUÇÃO: Erro "column tenant_id does not exist"

## ❌ Problema

Você recebeu o erro:
```
ERROR: 42703: column "tenant_id" does not exist
```

## 🔍 Causa

Isso acontece quando:
- Alguma tabela foi criada anteriormente sem a coluna `tenant_id`
- O schema foi executado parcialmente
- Há tabelas antigas sem a estrutura multi-tenant

## ✅ Soluções

### **OPÇÃO 1: Script de Correção (Recomendado - Preserva Dados)**

Se você já tem dados e não quer perder:

1. **Acesse:** Supabase Dashboard → SQL Editor
2. **Abra o arquivo:** `db/fix_schema.sql`
3. **Copie TODO o conteúdo**
4. **Cole no SQL Editor**
5. **Execute (Run)**

Este script:
- ✅ Verifica cada tabela
- ✅ Adiciona `tenant_id` se não existir
- ✅ Preserva dados existentes
- ✅ Cria um tenant padrão se necessário

### **OPÇÃO 2: Recriar Tudo (Se não tem dados importantes)**

Se você não tem dados importantes ou está começando:

1. **Acesse:** Supabase Dashboard → SQL Editor
2. **Abra o arquivo:** `db/schema_completo_fixado.sql`
3. **Antes de executar, descomente as linhas DROP TABLE** (linhas 13-19)
4. **Copie TODO o conteúdo**
5. **Cole no SQL Editor**
6. **Execute (Run)**

⚠️ **ATENÇÃO:** Isso apagará TODOS os dados existentes!

### **OPÇÃO 3: Verificar e Corrigir Manualmente**

Execute no SQL Editor para verificar quais tabelas têm problema:

```sql
-- Verificar quais tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar se tenant_id existe em cada tabela
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'produtos', 'fornecedores', 'vendas', 'contas_receber')
AND column_name = 'tenant_id';
```

Se alguma tabela não aparecer na segunda query, ela não tem `tenant_id`.

## 📋 Passo a Passo Recomendado

### 1️⃣ Executar Script de Correção

```sql
-- Execute o conteúdo de db/fix_schema.sql
```

### 2️⃣ Verificar se Funcionou

```sql
-- Verificar se todas as tabelas têm tenant_id
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE columns.table_name = tables.table_name 
      AND column_name = 'tenant_id'
    ) THEN '✅ Tem tenant_id'
    ELSE '❌ Falta tenant_id'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'produtos', 'fornecedores', 'vendas', 'contas_receber');
```

### 3️⃣ Executar Schema Completo

Depois da correção, execute o schema completo:

```sql
-- Execute o conteúdo de db/schema.sql
```

## 🎯 Verificação Final

Execute para confirmar que tudo está OK:

```sql
-- Verificar estrutura de todas as tabelas
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('tenants', 'profiles', 'produtos', 'fornecedores', 'vendas', 'contas_receber')
AND c.column_name = 'tenant_id'
ORDER BY t.table_name;
```

Todas as tabelas (exceto `tenants`) devem ter a coluna `tenant_id`.

## ⚠️ Importante

- **Se você tem dados:** Use `fix_schema.sql` (preserva dados)
- **Se está começando:** Use `schema_completo_fixado.sql` (recria tudo)
- **Sempre execute na ordem:** Correção → Schema completo

## 🆘 Ainda com Problemas?

Se ainda tiver erros:

1. **Verifique os logs** no Supabase Dashboard
2. **Execute uma tabela por vez** para identificar qual está com problema
3. **Verifique se a tabela `tenants` existe** antes de criar as outras

---

**Depois de corrigir, execute o schema completo novamente!** ✅

