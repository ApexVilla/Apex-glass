# 🚀 Guia de Deploy no Netlify

Este guia explica como fazer o deploy do Apex Glass ERP na Netlify.

## 📋 Pré-requisitos

1. Conta no Netlify (gratuita)
2. Repositório no GitHub/GitLab/Bitbucket
3. Credenciais do Supabase configuradas

## 🔧 Passo a Passo

### 1. Conectar o Repositório

1. Acesse [Netlify Dashboard](https://app.netlify.com)
2. Clique em **"Add new site"** > **"Import an existing project"**
3. Escolha seu provedor Git (GitHub, GitLab, etc.)
4. Selecione o repositório `Apex-glass`
5. Configure o **Base directory**: `apex-auto-glass-erp`
6. Configure o **Build command**: `npm install && npm run build`
7. Configure o **Publish directory**: `dist`

### 2. Configurar Variáveis de Ambiente

No painel do Netlify, vá em **Site settings** > **Environment variables** e adicione:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
```

**⚠️ IMPORTANTE**: Substitua pelos valores reais do seu projeto Supabase.

### 3. Configurações de Build

O arquivo `netlify.toml` já está configurado com:

- ✅ Build command: `npm install && npm run build`
- ✅ Publish directory: `dist`
- ✅ Node version: 18
- ✅ Redirects para SPA
- ✅ Headers de segurança
- ✅ Cache otimizado

### 4. Deploy

Após conectar o repositório e configurar as variáveis:

1. O Netlify fará o deploy automaticamente
2. Você pode acompanhar o progresso na aba **Deploys**
3. Após o sucesso, seu site estará disponível em `https://seu-site.netlify.app`

### 5. Deploy Manual (Opcional)

Se preferir fazer deploy manual via CLI:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Fazer login
netlify login

# Deploy de produção
npm run deploy:netlify
```

## 🔒 Segurança

O `netlify.toml` já inclui headers de segurança:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## 📝 Notas Importantes

1. **Base Directory**: Certifique-se de que está configurado como `apex-auto-glass-erp` no painel do Netlify
2. **Variáveis de Ambiente**: Nunca commite arquivos `.env` no Git
3. **Build Timeout**: O build padrão do Netlify tem timeout de 15 minutos (suficiente para este projeto)
4. **Branch Deploys**: Por padrão, o Netlify faz deploy apenas da branch `main`

## 🐛 Troubleshooting

### Erro: "Build failed"
- Verifique se as variáveis de ambiente estão configuradas
- Verifique os logs de build no painel do Netlify
- Certifique-se de que o Base directory está correto

### Erro: "Module not found"
- Verifique se o `package.json` está no diretório correto
- Execute `npm install` localmente para verificar dependências

### Erro: "404 Not Found" nas rotas
- Verifique se os redirects estão configurados no `netlify.toml`
- O arquivo já inclui redirects para SPA

## 📚 Recursos

- [Documentação Netlify](https://docs.netlify.com/)
- [Netlify CLI](https://cli.netlify.com/)
- [Configuração netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration/)

