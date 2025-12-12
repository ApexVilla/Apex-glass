# Diagnóstico e Correção de Deploy na Vercel (Atualizado)

O erro `Failed to fetch one or more git submodules` ocorre porque o Git ainda "pensa" que a pasta `apex-auto-glass-erp` é um projeto separado (submodule), mesmo que tenhamos removido a pasta `.git` de dentro dela.

## 🚨 Ação Crítica Necessária

Você precisa executar o script de correção do Git e, **OBRIGATORIAMENTE**, alterar a configuração na Vercel.

### 1. Corrigir o Git (Localmente)

Execute o novo script que preparei para remover a referência de submodule e adicionar os arquivos reais:

```bash
./corrigir_git_submodule.sh
```

Depois disso, faça o push para o GitHub:

```bash
git push
```

### 2. Configurar a Vercel (No Painel Online)

O erro de `npm install` também acontece porque a Vercel está rodando na raiz errada.

1.  Acesse seu projeto no dashboard da Vercel.
2.  Vá em **Settings** (Configurações) > **General**.
3.  Procure por **Root Directory**.
4.  Clique em **Edit**.
5.  Selecione a pasta `apex-auto-glass-erp`.
6.  Clique em **Save**.

### 3. Verificar Build Command

Após mudar o Root Directory, verifique se as configurações de "Build & Development Settings" mudaram para:

-   **Framework Preset**: Vite
-   **Build Command**: `npm run build` (não deve ter `cd ...`)
-   **Output Directory**: `dist` (não deve ter `apex-auto-glass-erp/...`)

Se estiverem diferentes, clique em "Override" e ajuste.

---

## Resumo do Problema

| Problema | Causa | Solução |
| :--- | :--- | :--- |
| **Git Submodule Error** | O index do Git aponta `apex-auto-glass-erp` como commit hash (160000) | `git rm --cached` e readicionar arquivos (feito pelo script) |
| **Install Error** | Vercel rodando na raiz errada | Mudar **Root Directory** para `apex-auto-glass-erp` |

Execute o script e ajuste o painel da Vercel para resolver definitivamente.
