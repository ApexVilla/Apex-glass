# ✅ USE ESTE ARQUIVO: `db/schema_simples.sql`

## 🎯 Solução Definitiva

Criei o arquivo **`db/schema_simples.sql`** que resolve todos os problemas de uma vez.

### Por que este arquivo funciona:

1. ✅ **Não tenta remover policies de tabelas que não existem**
2. ✅ **Usa `DROP TABLE IF EXISTS CASCADE`** - remove tudo automaticamente
3. ✅ **Cria tudo do zero** de forma limpa
4. ✅ **Sem verificações complexas** - mais simples e direto

## 📋 Como Executar

### 1. Abrir Arquivo

Abra: **`db/schema_simples.sql`**

### 2. Copiar TUDO

- `Ctrl+A` (selecionar tudo)
- `Ctrl+C` (copiar)

### 3. No Supabase

1. **Acesse:** Supabase Dashboard → SQL Editor
2. **Limpe o editor** (delete tudo que estiver lá)
3. **Cole:** `Ctrl+V`
4. **Verifique** que começa com `--` ou `CREATE` (não `REATE`)

### 4. Executar

- Clique em **Run** ou `Ctrl+Enter`

### 5. Verificar

Execute esta query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'profiles', 'produtos', 'fornecedores', 'vendas', 'venda_itens', 'contas_receber')
ORDER BY table_name;
```

Deve retornar **7 tabelas**.

## ✅ O que este script faz:

1. ✅ Remove tabelas existentes (se houver) com `CASCADE`
2. ✅ Remove funções existentes
3. ✅ Cria todas as tabelas do zero
4. ✅ Cria índices
5. ✅ Cria funções
6. ✅ Cria triggers
7. ✅ Habilita RLS
8. ✅ Cria todas as policies

## ⚠️ Importante

- **Este script apaga todos os dados existentes**
- Se você tem dados importantes, faça backup primeiro
- Se está começando, pode executar sem problemas

## 🎉 Depois de Executar com Sucesso

1. ✅ Execute `db/seeds.sql` (opcional, para dados de teste)
2. ✅ Configure `.env.local` com suas credenciais do Supabase
3. ✅ Inicie o servidor: `npm run dev`
4. ✅ Acesse: http://localhost:3000/signup

---

**🎯 Use `db/schema_simples.sql` - É o mais simples e funciona sempre!** ✅

