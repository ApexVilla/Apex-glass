# Diagnóstico e Correção de Deploy na Vercel

Este documento detalha os problemas encontrados no projeto e as correções aplicadas para garantir um deploy bem-sucedido na Vercel.

## 1. Diagnóstico Completo

### 🔴 Problema 1: Falha ao buscar git submodules
**Causa:** Existia uma pasta `.git` dentro de `apex-auto-glass-erp`, fazendo com que o git (e a Vercel) a tratasse como um sub-repositório (submodule) mal configurado.
**Status:** ✅ **CORRIGIDO**. A pasta `.git` interna foi removida.

### 🔴 Problema 2: Estrutura do Projeto (Nested Project)
**Causa:** O código real da aplicação está dentro de `apex-auto-glass-erp`, mas a Vercel tenta ler a raiz por padrão. O `package.json` da raiz era apenas um script de redirecionamento.
**Status:** ⚠️ **Requer Ajuste na Vercel**. Você deve configurar o "Root Directory" no painel da Vercel.

### 🔴 Problema 3: Configuração `vercel.json`
**Causa:** Havia arquivos `vercel.json` conflitantes e com configurações antigas. O suporte a PHP (Backend) e Vite (Frontend) precisava ser unificado.
**Status:** ✅ **CORRIGIDO**. O arquivo `apex-auto-glass-erp/vercel.json` foi reescrito para suportar Vite (SPA) e PHP (API) simultaneamente.

### 🔴 Problema 4: Variáveis de Ambiente
**Causa:** Não havia um modelo claro das variáveis necessárias.
**Status:** ✅ **CORRIGIDO**. Criado arquivo `.env.example` com as chaves necessárias.

---

## 2. Arquivos Corrigidos

### `apex-auto-glass-erp/vercel.json`
Atualizado para:
- Definir `dist` como diretório de saída.
- Configurar `vercel-php` para arquivos em `backend/public`.
- Redirecionar rotas `/api/*` para o backend e outras para o `index.html` (SPA).

### `apex-auto-glass-erp/.env.example`
Criado com:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Variáveis de Banco de Dados (DB_HOST, etc.)

---

## 3. Checklist Final para Deploy

Siga estes passos exatos para finalizar:

1.  **Commitar as alterações**:
    Execute o script de correção ou faça o commit manual das mudanças (remoção do .git interno e novos arquivos).

2.  **Configurar Vercel (Painel)**:
    - Vá em **Settings** > **General**.
    - Em **Root Directory**, clique em "Edit" e selecione `apex-auto-glass-erp`.
    - Isso é CRUCIAL. A Vercel passará a ignorar a pasta raiz e olhará apenas para dentro do projeto real.

3.  **Configurar Variáveis de Ambiente (Painel)**:
    - Vá em **Settings** > **Environment Variables**.
    - Adicione as variáveis listadas em `.env.example` (copie os valores do seu `.env` local ou do Supabase).

4.  **Redeploy**:
    - Vá em **Deployments** e force um novo deploy (ou faça um novo push no git).

---

## 4. Comandos para Teste Local

Para testar se tudo está funcionando localmente como na Vercel:

```bash
# Entre na pasta do projeto
cd apex-auto-glass-erp

# Instale as dependências
npm install

# Rode o build para testar erros
npm run build

# Para simular o ambiente Vercel (requer Vercel CLI)
npx vercel dev
```
