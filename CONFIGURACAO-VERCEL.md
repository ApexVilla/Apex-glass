# Configuração do Vercel

## Problema: Erro NOT_FOUND

O erro `NOT_FOUND` ocorre porque o Vercel precisa saber onde está o projeto.

## Solução

### 1. Configurar Root Directory no Vercel

1. Acesse o painel do Vercel: https://vercel.com
2. Vá em **Settings** → **General**
3. Em **Root Directory**, configure:
   ```
   apex-auto-glass-erp
   ```
4. Clique em **Save**

### 2. Configurar Build Settings

No mesmo painel, em **Build and Development Settings**:

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Configurar Variáveis de Ambiente

1. Vá em **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
```

**Importante**: Substitua pelos valores reais do seu projeto Supabase.

### 4. Fazer Novo Deploy

Após configurar:
1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**
4. Ou faça um novo push para o GitHub

## Verificar se está funcionando

Após o deploy, acesse a URL fornecida pelo Vercel. Se ainda houver erro:
1. Verifique os logs do build no Vercel
2. Confirme que as variáveis de ambiente estão configuradas
3. Verifique se o Root Directory está correto

