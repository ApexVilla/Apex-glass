# 🚀 Como Iniciar o Servidor - Guia Rápido

## ⚠️ Problema: Servidor não está rodando

O erro "Firefox não conseguiu estabelecer conexão" significa que o servidor Next.js não está rodando.

## ✅ Solução Passo a Passo

### 1️⃣ Criar arquivo `.env.local`

Crie o arquivo `.env.local` na raiz do projeto com suas credenciais do Supabase:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
nano .env.local
```

Ou use o editor de sua preferência. Cole o seguinte conteúdo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Onde obter essas credenciais:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto (ou crie um novo)
3. Vá em: **Settings → API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 2️⃣ Executar Schema SQL no Supabase

Antes de iniciar, você precisa criar as tabelas no Supabase:

1. No Supabase Dashboard, vá em **SQL Editor**
2. Abra o arquivo `db/schema.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run**

Isso criará todas as tabelas e policies RLS.

### 3️⃣ Iniciar o Servidor

No terminal, execute:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
npm run dev
```

Você verá algo como:

```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

### 4️⃣ Acessar no Navegador

Agora acesse:
```
http://localhost:3000
```

Ou diretamente:
```
http://localhost:3000/signup
```

---

## 🔧 Se Ainda Não Funcionar

### Verificar se Node.js está instalado:

```bash
node --version
npm --version
```

Se não estiver instalado, instale Node.js 18+:
- https://nodejs.org/

### Verificar se dependências estão instaladas:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
npm install
```

### Verificar erros no terminal:

Quando executar `npm run dev`, veja se há erros. Erros comuns:

1. **"Missing environment variables"**
   - Solução: Crie o `.env.local` (passo 1)

2. **"Cannot find module"**
   - Solução: Execute `npm install`

3. **"Port 3000 is already in use"**
   - Solução: Mate o processo na porta 3000 ou use outra porta:
   ```bash
   PORT=3001 npm run dev
   ```

---

## 📝 Comandos Úteis

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor de produção
npm run start

# Verificar tipos TypeScript
npm run type-check
```

---

## ✅ Checklist Rápido

- [ ] Arquivo `.env.local` criado com credenciais do Supabase
- [ ] Schema SQL executado no Supabase (`db/schema.sql`)
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Acessar http://localhost:3000

---

**Depois de seguir esses passos, o servidor deve funcionar!** 🎉

