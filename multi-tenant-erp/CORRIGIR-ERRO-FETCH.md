# 🔴 Erro "TypeError: fetch failed" - Solução Rápida

## ⚠️ Problema

Ao tentar criar conta, aparece:
```
TypeError: fetch failed
```

## 🎯 Causa

**As variáveis de ambiente não estão configuradas corretamente!**

O arquivo `.env.local` ainda tem valores placeholder ao invés dos valores reais do Supabase.

## ✅ Solução Passo a Passo

### Passo 1: Abrir o Supabase Dashboard

1. Acesse: **https://supabase.com/dashboard**
2. **Faça login** na sua conta
3. **Selecione seu projeto** (ou crie um novo se não tiver)

### Passo 2: Copiar as Chaves

1. No projeto Supabase, vá em: **Settings** → **API**
2. Você verá 3 valores importantes:

   **a) Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   Copie este valor completo.

   **b) anon public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Copie este valor completo (é muito longo).

   **c) service_role key:** ⚠️ **SECRETO!**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Copie este valor completo (é muito longo e secreto).

### Passo 3: Editar o arquivo `.env.local`

1. **Abra o arquivo** `.env.local` na raiz do projeto:
   ```bash
   cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
   nano .env.local
   ```
   
   Ou use seu editor preferido (VS Code, etc.)

2. **Substitua** os valores placeholder pelos valores reais que você copiou:

   **ANTES (errado):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   **DEPOIS (correto):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjkwLCJleHAiOjE5NTQ1NDMyOTB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   **⚠️ IMPORTANTE:**
   - Use os valores REAIS do seu projeto Supabase
   - Não deixe valores placeholder como `seu-projeto` ou `sua-chave`
   - Não coloque aspas ao redor dos valores
   - Não deixe espaços antes ou depois do `=`

3. **Salve o arquivo**

### Passo 4: Reiniciar o Servidor

**⚠️ CRÍTICO:** Após editar `.env.local`, você DEVE reiniciar o servidor!

1. **Pare o servidor:**
   - No terminal onde `npm run dev` está rodando
   - Pressione `Ctrl+C`

2. **Inicie novamente:**
   ```bash
   npm run dev
   ```

3. **Aguarde** o servidor iniciar (você verá "Ready" no terminal)

### Passo 5: Testar Novamente

1. Acesse: **http://localhost:3000/signup**
2. Preencha o formulário
3. Tente criar a conta
4. **Agora deve funcionar!** ✅

## 🔍 Verificar se Está Correto

Execute no terminal:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
cat .env.local | grep SUPABASE
```

**Você deve ver:**
- URLs começando com `https://` e terminando com `.supabase.co`
- Chaves muito longas começando com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Você NÃO deve ver:**
- ❌ `seu-projeto.supabase.co`
- ❌ `sua-chave-publica-anon-key`
- ❌ `sua-chave-service-role-secreta`

## ⚠️ Erros Comuns

### Erro: "Ainda mostra fetch failed"

**Solução:**
- Verifique se reiniciou o servidor após editar `.env.local`
- Verifique se copiou as chaves completas (elas são muito longas)
- Verifique se não há espaços extras no arquivo

### Erro: "Variáveis de ambiente ainda contêm valores placeholder"

**Solução:**
- Você ainda tem valores como `seu-projeto` ou `sua-chave`
- Substitua pelos valores reais do Supabase

### Erro: "Configuração incompleta"

**Solução:**
- Verifique se todas as 4 variáveis estão no `.env.local`
- Verifique se não há linhas vazias ou comentários quebrados

## ✅ Checklist Final

- [ ] Acessei o Supabase Dashboard
- [ ] Copiei a **Project URL** completa
- [ ] Copiei a **anon public key** completa
- [ ] Copiei a **service_role key** completa
- [ ] Editei o `.env.local` com os valores reais
- [ ] Salvei o arquivo
- [ ] **Reiniciei o servidor** (Ctrl+C e depois `npm run dev`)
- [ ] Testei criar uma conta novamente

---

**Após seguir estes passos, o erro deve ser resolvido!** ✅

Se ainda não funcionar, me envie a mensagem de erro completa do console do navegador (F12 → Console).

