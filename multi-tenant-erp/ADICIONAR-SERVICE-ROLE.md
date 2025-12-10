# ⚠️ Falta a Chave SERVICE_ROLE_KEY

## ✅ O que já foi configurado:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Configurado
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configurado
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **FALTA ESTA!**

## 🎯 Por que precisa da SERVICE_ROLE_KEY?

A chave `service_role` é necessária para:
- Criar usuários no Supabase Auth (signup)
- Criar tenants e profiles
- Operações administrativas

**Sem ela, o signup não funciona!**

## 📋 Como encontrar a SERVICE_ROLE_KEY

### Passo 1: Acesse o Supabase Dashboard

1. Vá em: **https://supabase.com/dashboard**
2. Selecione seu projeto: `xxsgponcxnmwkqnrktel`

### Passo 2: Vá em Settings → API

1. No menu lateral, clique em **Settings** (⚙️)
2. Clique em **API**

### Passo 3: Copie a chave service_role

1. Role a página até encontrar a seção **Project API keys**
2. Você verá várias chaves:
   - `anon` `public` - ✅ Já configurada
   - `service_role` `secret` - ❌ **ESTA É A QUE FALTA!**

3. **Clique no ícone de olho** 👁️ ao lado de `service_role` para revelar
4. **Copie a chave completa** (é muito longa, começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Passo 4: Adicionar no .env.local

1. Abra o arquivo `.env.local`:
   ```bash
   cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
   nano .env.local
   ```

2. Encontre a linha:
   ```
   SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_CHAVE_SERVICE_ROLE_DO_SUPABASE
   ```

3. Substitua `COLE_AQUI_A_CHAVE_SERVICE_ROLE_DO_SUPABASE` pela chave que você copiou

4. **Salve o arquivo** (Ctrl+O, Enter, Ctrl+X no nano)

### Passo 5: Reiniciar o servidor

**⚠️ IMPORTANTE:** Após adicionar a chave, reinicie o servidor!

```bash
# Pare o servidor (Ctrl+C)
# Depois inicie novamente:
npm run dev
```

## 🔒 Segurança

⚠️ **A chave `service_role` é SECRETA!**

- ❌ **NUNCA** compartilhe publicamente
- ❌ **NUNCA** commite no Git (já está no .gitignore)
- ✅ **SOMENTE** use no servidor/backend
- ✅ Mantenha segura

## ✅ Após configurar

1. Teste criar uma conta em: http://localhost:3000/signup
2. Deve funcionar agora! ✅

---

**Depois de adicionar a SERVICE_ROLE_KEY e reiniciar o servidor, o signup deve funcionar!** 🚀

