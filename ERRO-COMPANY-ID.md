# 🔴 Erro: column "company_id" does not exist

## ⚠️ Problema

O erro indica que o código está tentando acessar a coluna `company_id`, mas ela não existe no banco de dados.

## 🎯 Causa

Você está usando o **projeto antigo** (`apex-auto-glass-erp`) que espera:
- Tabela `companies` com coluna `company_id` em `profiles`

Mas o banco de dados foi migrado para o **schema do novo projeto** (`multi-tenant-erp`) que usa:
- Tabela `tenants` com coluna `tenant_id` em `profiles`

## ✅ Soluções

### Opção 1: Usar o Projeto Novo (Recomendado)

O projeto novo (`multi-tenant-erp`) já está configurado corretamente:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
npm run dev
```

Acesse: http://localhost:3000

### Opção 2: Reverter o Schema do Banco

Se você precisa usar o projeto antigo, precisa aplicar o schema antigo no banco:

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o schema antigo que usa `companies` e `company_id`

**⚠️ ATENÇÃO:** Isso vai sobrescrever o schema atual e você perderá os dados do projeto novo!

### Opção 3: Usar Bancos Diferentes

Configure dois projetos Supabase separados:
- Um para o projeto antigo (com schema `companies`)
- Um para o projeto novo (com schema `tenants`)

## 🔍 Verificar Qual Schema Está no Banco

Execute no Supabase SQL Editor:

```sql
-- Verificar se existe tabela companies
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'companies'
);

-- Verificar se existe tabela tenants
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tenants'
);

-- Verificar colunas da tabela profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';
```

## 📋 Resumo

- **Projeto Antigo:** Espera `companies` e `company_id`
- **Projeto Novo:** Usa `tenants` e `tenant_id`
- **Banco Atual:** Provavelmente tem o schema do projeto novo

**Solução:** Use o projeto novo (`multi-tenant-erp`) que está alinhado com o schema atual do banco.

---

**Recomendação:** Continue usando o projeto novo (`multi-tenant-erp`) que já está configurado e funcionando! ✅

