# 🚀 Guia de Deploy no Netlify

Este guia explica como fazer o deploy do Apex Glass ERP no Netlify.

## 📋 Pré-requisitos

1. Conta no Netlify (grátis): https://app.netlify.com/signup
2. Repositório no GitHub/GitLab/Bitbucket
3. Credenciais do Supabase (URL e chave pública)

## 🔧 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que todos os arquivos estão commitados e enviados para o repositório:

```bash
git add .
git commit -m "Preparar para deploy no Netlify"
git push
```

### 2. Conectar ao Netlify

1. Acesse https://app.netlify.com
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Escolha seu provedor (GitHub, GitLab ou Bitbucket)
4. Autorize o Netlify a acessar seus repositórios
5. Selecione o repositório `apex-glass1.2` ou `apex-auto-glass-erp`

### 3. Configurar Build Settings

O Netlify deve detectar automaticamente as configurações do arquivo `netlify.toml`, mas verifique:

- **Base directory**: Deixe vazio (ou `apex-auto-glass-erp` se o projeto estiver em subpasta)
- **Build command**: `npm install && npm run build`
- **Publish directory**: `dist`

> ⚠️ **Importante**: Se o projeto estiver na raiz do repositório, deixe "Base directory" vazio. Se estiver em uma subpasta, coloque o nome da pasta (ex: `apex-auto-glass-erp`).

### 4. Configurar Variáveis de Ambiente

No painel do Netlify, vá em **Site settings** → **Environment variables** e adicione:

```
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-do-supabase
```

**Como obter essas variáveis:**
1. Acesse seu projeto no Supabase: https://app.supabase.com
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 5. Fazer o Deploy

1. Clique em **"Deploy site"**
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Quando terminar, você verá uma URL como: `seu-projeto.netlify.app`

### 6. Configurar Domínio Personalizado (Opcional)

1. Vá em **Site settings** → **Domain management**
2. Clique em **"Add custom domain"**
3. Siga as instruções para configurar seu domínio

## ✅ Verificações Pós-Deploy

Após o deploy, verifique:

- [ ] O site carrega corretamente
- [ ] O login funciona
- [ ] As requisições ao Supabase estão funcionando
- [ ] As rotas do React Router funcionam (teste navegar entre páginas)

## 🔄 Deploys Automáticos

O Netlify faz deploy automático sempre que você fizer push para a branch principal (geralmente `main` ou `master`).

Para desabilitar ou configurar:
- Vá em **Site settings** → **Build & deploy** → **Continuous Deployment**

## 🐛 Solução de Problemas

### Erro: "Build failed"

**Causa comum**: Variáveis de ambiente não configuradas

**Solução**: 
1. Verifique se todas as variáveis estão configuradas no Netlify
2. Verifique os logs de build para mais detalhes

### Erro: "Page not found" ao navegar

**Causa comum**: Arquivo `_redirects` não está funcionando

**Solução**:
1. Verifique se o arquivo `public/_redirects` existe
2. Verifique se o conteúdo está correto: `/*    /index.html   200`

### Erro: "Supabase connection failed"

**Causa comum**: Variáveis de ambiente incorretas ou não configuradas

**Solução**:
1. Verifique se as variáveis estão corretas no Netlify
2. Verifique se a URL do Supabase está correta
3. Verifique se a chave pública está correta

### Build muito lento

**Solução**:
1. Verifique se o `node_modules` está no `.gitignore`
2. O Netlify instala as dependências automaticamente

## 📝 Comandos Úteis

### Deploy manual via CLI

Se você instalou o Netlify CLI:

```bash
# Instalar Netlify CLI (se ainda não tiver)
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Ver logs de build

No painel do Netlify:
- Vá em **Deploys**
- Clique no deploy desejado
- Veja os logs completos

## 🔐 Segurança

- ✅ Nunca commite arquivos `.env` no repositório
- ✅ Use apenas a chave **pública** (anon) do Supabase no frontend
- ✅ Configure RLS (Row Level Security) no Supabase para proteger os dados
- ✅ Use variáveis de ambiente no Netlify para credenciais

## 📚 Recursos Adicionais

- [Documentação do Netlify](https://docs.netlify.com/)
- [Guia de Deploy de SPAs](https://docs.netlify.com/routing/redirects/rewrites-proxies/#spa-fallback)
- [Configuração de Variáveis de Ambiente](https://docs.netlify.com/environment-variables/overview/)

## 🎉 Pronto!

Seu sistema está no ar! Compartilhe a URL com sua equipe.

---

**Dúvidas?** Verifique os logs de build no painel do Netlify ou consulte a documentação oficial.

