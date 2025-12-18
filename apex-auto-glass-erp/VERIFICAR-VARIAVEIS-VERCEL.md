# 🔍 Como Verificar Variáveis de Ambiente no Vercel

## Problema: "Invalid API key"

Se você está recebendo o erro "Invalid API key", significa que:
- ✅ As variáveis estão sendo lidas pelo Vercel
- ❌ Mas a chave está incorreta, incompleta ou expirada

## 📋 Checklist de Verificação

### 1. Verificar se as variáveis estão configuradas no Vercel

1. Acesse: https://vercel.com
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Verifique se existem:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

### 2. Verificar os valores das variáveis

#### ✅ VITE_SUPABASE_URL deve ser:
- Formato: `https://xxxxx.supabase.co`
- Não pode ser: `https://seu-projeto.supabase.co` (placeholder)
- Não pode estar vazio

#### ✅ VITE_SUPABASE_PUBLISHABLE_KEY deve ser:
- Uma chave JWT longa (começa com `eyJ...`)
- Não pode ser: `sua-chave-publica` (placeholder)
- Não pode ser: `placeholder-key`
- Não pode estar vazia
- Deve ter pelo menos 100 caracteres

### 3. Verificar se está marcado para Production

Certifique-se de que as variáveis estão marcadas para:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 4. Obter as chaves corretas do Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → use em `VITE_SUPABASE_URL`
   - **anon public** key → use em `VITE_SUPABASE_PUBLISHABLE_KEY`

⚠️ **IMPORTANTE**: Use a chave **anon public**, NÃO a **service_role**!

### 5. Atualizar as variáveis no Vercel

1. No Vercel, vá em **Settings** → **Environment Variables**
2. Para cada variável:
   - Clique nos três pontos (...)
   - Selecione **Edit**
   - Cole o valor correto do Supabase
   - Marque todas as opções (Production, Preview, Development)
   - Clique em **Save**

### 6. Fazer novo deploy

Após atualizar as variáveis:

**Opção A - Redeploy:**
1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Selecione **Redeploy**
4. Aguarde o build completar

**Opção B - Novo commit:**
1. Faça um commit qualquer (ex: atualizar README)
2. Faça push para o GitHub
3. O Vercel fará deploy automático

### 7. Verificar os logs do build

1. No Vercel, vá em **Deployments**
2. Clique no último deploy
3. Veja os **Build Logs**
4. Procure por erros relacionados a variáveis de ambiente

Se o build passou mas ainda há erro, verifique os **Runtime Logs**.

## 🚨 Problemas Comuns

### Problema 1: Variável não está sendo lida
**Sintoma**: Erro "Variáveis de ambiente obrigatórias não configuradas"
**Solução**: 
- Verifique se o nome está exatamente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Verifique se está marcado para Production
- Faça um novo deploy após adicionar

### Problema 2: Chave inválida
**Sintoma**: Erro "Invalid API key"
**Solução**:
- Verifique se copiou a chave completa (não cortada)
- Verifique se está usando a chave **anon public**, não service_role
- Verifique se não há espaços extras no início/fim
- Obtenha uma nova chave do Supabase se necessário

### Problema 3: URL incorreta
**Sintoma**: Erro de conexão ou "Invalid API key"
**Solução**:
- Verifique se a URL começa com `https://`
- Verifique se termina com `.supabase.co`
- Verifique se não há espaços extras

## 📝 Exemplo de Valores Corretos

```
VITE_SUPABASE_URL=https://xxsgponcxnmwkqnrktel.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c2dwb25jeG5td2txbnJrdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTU0MDAsImV4cCI6MjA3OTk5MTQwMH0.NO9Xi27KqMxvp9RJGcy4rGiiAtaticEAp_sCvG6XeqM
```

## ✅ Teste Final

Após configurar tudo:

1. Faça um novo deploy
2. Acesse a URL do Vercel
3. Abra o console do navegador (F12)
4. Verifique se não há erros de "Invalid API key"
5. Tente fazer login

Se ainda houver erro, verifique os logs do Vercel para mais detalhes.

