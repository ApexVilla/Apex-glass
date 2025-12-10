# 🔧 Verificar Variáveis de Ambiente

## ⚠️ Erro: "TypeError: fetch failed"

Este erro geralmente significa que as variáveis de ambiente não estão configuradas corretamente.

## 🔍 Como Verificar

### 1. Verificar se o arquivo `.env.local` existe e tem valores reais

Execute no terminal:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
cat .env.local
```

**O que você deve ver:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**O que NÃO deve aparecer:**
- ❌ `seu-projeto.supabase.co`
- ❌ `sua-chave-publica-anon-key`
- ❌ `sua-chave-service-role-secreta`

### 2. Onde encontrar os valores corretos no Supabase

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em:** Settings → API
4. **Copie:**

   - **Project URL** → Cole em `NEXT_PUBLIC_SUPABASE_URL`
     ```
     Exemplo: https://abcdefghijklmnop.supabase.co
     ```

   - **anon public** key → Cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     ```
     Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

   - **service_role** key → Cole em `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRETO!**
     ```
     Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

### 3. Editar o arquivo `.env.local`

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
nano .env.local
```

**Ou use seu editor preferido** (VS Code, etc.)

**Substitua os valores placeholder pelos valores reais do Supabase.**

### 4. Verificar formato do arquivo

O arquivo `.env.local` deve ter exatamente este formato:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Importante:**
- ✅ Sem espaços antes ou depois do `=`
- ✅ Sem aspas ao redor dos valores
- ✅ Uma variável por linha
- ✅ Sem linhas vazias no meio

### 5. Reiniciar o servidor

**Após editar `.env.local`, você DEVE reiniciar o servidor:**

```bash
# Pare o servidor (Ctrl+C no terminal onde está rodando)
# Depois inicie novamente:
npm run dev
```

**⚠️ IMPORTANTE:** O Next.js só lê variáveis de ambiente na inicialização. Se você mudar o `.env.local`, precisa reiniciar!

## ✅ Checklist

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] `NEXT_PUBLIC_SUPABASE_URL` tem a URL real do Supabase (não placeholder)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` tem a chave anon real (não placeholder)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tem a chave service_role real (não placeholder)
- [ ] Servidor foi reiniciado após editar `.env.local`
- [ ] URL do Supabase começa com `https://` e termina com `.supabase.co`

## 🧪 Testar Conexão

Após configurar, teste se a conexão funciona:

1. Acesse: http://localhost:3000/signup
2. Preencha o formulário
3. Tente criar a conta
4. Se ainda der erro, veja a mensagem de erro no console do navegador (F12 → Console)

## 🔍 Se Ainda Não Funcionar

1. **Verifique o console do servidor** (terminal onde `npm run dev` está rodando)
   - Lá você verá o erro real

2. **Verifique o Network tab** no DevTools do navegador (F12)
   - Veja a requisição `/api/auth/signup`
   - Clique nela e veja a resposta

3. **Verifique se o Supabase está acessível:**
   ```bash
   curl https://seu-projeto-id.supabase.co
   ```
   (Substitua pelo seu projeto ID real)

---

**A causa mais comum é usar valores placeholder ao invés dos valores reais do Supabase!** ✅

