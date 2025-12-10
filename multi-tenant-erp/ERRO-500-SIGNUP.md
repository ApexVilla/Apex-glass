# 🔴 Erro 500 no Signup - Como Resolver

## 🎯 Problema

Ao tentar criar uma conta, você recebe:
```
POST http://localhost:3000/api/auth/signup
[HTTP/1.1 500 Internal Server Error]
```

## 🔍 Causas Possíveis

### 1. ⚠️ Variáveis de Ambiente Não Configuradas

**Sintoma:** Erro 500 sem mensagem clara

**Solução:**
1. Abra o arquivo `.env.local` na raiz do projeto
2. Substitua os valores placeholder pelos valores reais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Onde encontrar no Supabase:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRETO!**

### 2. ⚠️ Schema do Banco Não Executado

**Sintoma:** Erro sobre tabelas não existentes

**Solução:**
1. Acesse o Supabase SQL Editor
2. Execute o arquivo `db/schema_simples.sql` (ou o schema que você usou)
3. Verifique se as tabelas foram criadas:
   - `tenants`
   - `profiles`
   - `produtos`
   - `vendas`
   - etc.

### 3. ⚠️ Service Role Key Incorreta

**Sintoma:** Erro de autenticação ao criar usuário

**Solução:**
- Verifique se copiou a chave **service_role** completa
- Não use a chave **anon**, use a **service_role**
- A chave service_role é muito longa, certifique-se de copiar tudo

### 4. ⚠️ Slug Já Existe

**Sintoma:** Erro "Este slug já está em uso"

**Solução:**
- Escolha um slug diferente
- Ou delete o tenant existente no banco

## 🔧 Passos para Resolver

### Passo 1: Verificar Variáveis de Ambiente

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
cat .env.local
```

**Deve mostrar valores reais, não placeholders!**

### Passo 2: Verificar Console do Servidor

Olhe o terminal onde o `npm run dev` está rodando. Você verá o erro real:

```
Signup error: [erro detalhado aqui]
```

### Passo 3: Verificar Banco de Dados

1. Acesse Supabase Dashboard
2. Vá em **Table Editor**
3. Verifique se as tabelas existem:
   - `tenants`
   - `profiles`

### Passo 4: Testar Conexão

Crie um arquivo de teste temporário:

```typescript
// test-connection.ts (temporário)
import { createServiceRoleClient } from './lib/supabaseServer'

const supabase = createServiceRoleClient()
const { data, error } = await supabase.from('tenants').select('count')

console.log('Connection test:', { data, error })
```

## 📋 Checklist de Verificação

- [ ] `.env.local` existe e tem valores reais (não placeholders)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está correto
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está correto
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está correto (chave service_role, não anon)
- [ ] Schema do banco foi executado com sucesso
- [ ] Tabelas `tenants` e `profiles` existem
- [ ] Servidor Next.js foi reiniciado após mudar `.env.local`

## 🚀 Após Corrigir

1. **Reinicie o servidor:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Inicie novamente
   npm run dev
   ```

2. **Teste novamente:**
   - Acesse http://localhost:3000/signup
   - Preencha o formulário
   - Tente criar a conta

## 🔍 Como Ver o Erro Real

O código agora mostra mensagens de erro mais detalhadas. Se ainda não aparecer:

1. **Abra o DevTools do navegador** (F12)
2. **Vá na aba Network**
3. **Tente criar a conta novamente**
4. **Clique na requisição `/api/auth/signup`**
5. **Veja a aba "Response"** - lá estará a mensagem de erro real

## 💡 Dica

Se o erro persistir, copie a mensagem de erro completa do console do servidor e me envie. Isso ajudará a identificar o problema exato.

---

**A causa mais comum é variáveis de ambiente não configuradas!** ✅

