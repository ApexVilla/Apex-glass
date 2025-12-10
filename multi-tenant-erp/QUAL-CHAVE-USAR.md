# 🔑 Qual Chave Usar: Publishable vs Service Role

## ⚠️ Diferença Importante

O Supabase tem **dois tipos de chaves**:

### 1. 🔵 Publishable Key (formato `sb_...`)
- **Formato:** Começa com `sb_` ou `sb_publishable_`
- **Uso:** Frontend (cliente)
- **Permissões:** Limitadas (respeita RLS)
- **Exemplo:** `sb_secret_rs4hpXzaIz3JLPi5xlrC9A_XJ6kQ6w2`

### 2. 🔴 Service Role Key (formato JWT `eyJ...`)
- **Formato:** JWT token muito longo, começa com `eyJ`
- **Uso:** Backend/Server (operações administrativas)
- **Permissões:** Totais (ignora RLS)
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c2dwb25jeG5td2txbnJrdGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQxNTQwMCwiZXhwIjoyMDc5OTkxNDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 🎯 Para o Signup Funcionar

**Você precisa da chave SERVICE_ROLE (JWT), não da publishable!**

O signup precisa:
- ✅ Criar usuários no Supabase Auth
- ✅ Criar tenants e profiles
- ✅ Operações administrativas

Isso só funciona com a **service_role key** (JWT).

## 📋 Como Encontrar a Service Role Key

### Passo 1: Acesse o Supabase Dashboard

1. Vá em: **https://supabase.com/dashboard**
2. Selecione seu projeto: **xxsgponcxnmwkqnrktel**

### Passo 2: Vá em Settings → API

1. Menu lateral → **Settings** (⚙️)
2. Clique em **API**

### Passo 3: Encontre a Service Role Key

Na seção **"Project API keys"**, você verá:

```
anon          public    [chave longa eyJ...]  👁️
service_role  secret    [oculto]               👁️  ← ESTA É A QUE VOCÊ PRECISA!
```

### Passo 4: Revele e Copie

1. **Clique no ícone de olho** 👁️ ao lado de `service_role`
2. **Copie a chave completa** - ela é MUITO longa (mais de 200 caracteres)
3. **Começa com:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Passo 5: Adicione no .env.local

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
nano .env.local
```

Substitua:
```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_rs4hpXzaIz3JLPi5xlrC9A_XJ6kQ6w2
```

Por:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c2dwb25jeG5td2txbnJrdGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQxNTQwMCwiZXhwIjoyMDc5OTkxNDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Use a chave REAL que você copiou do Supabase!**

## ✅ Verificar se Está Correto

A chave service_role deve:
- ✅ Começar com `eyJ` (não `sb_`)
- ✅ Ser muito longa (mais de 200 caracteres)
- ✅ Ter 3 partes separadas por pontos (JWT)

## 🔍 Se Ainda Não Funcionar

Se você adicionar a chave publishable (`sb_...`) e ainda der erro "Invalid API key", é porque precisa da service_role key (JWT).

A chave que você forneceu (`sb_secret_...`) é uma publishable key, que não tem permissões para criar usuários.

---

**Resumo:** Use a chave `service_role` (JWT, começa com `eyJ`), não a publishable (`sb_`). ✅

