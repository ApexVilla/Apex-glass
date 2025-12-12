# 🔍 DIAGNÓSTICO COMPLETO - DEPLOY VERCEL

## 📋 SUMÁRIO EXECUTIVO

**Status Atual:** ❌ Deploy falhando  
**Framework:** React + Vite  
**Estrutura:** Monorepo com subdiretório `apex-auto-glass-erp`  
**Problema Principal:** Configuração incorreta do Vercel para estrutura de monorepo

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Estrutura do Projeto**
- ❌ `apex-auto-glass-erp` é um repositório Git separado, mas não está configurado como submódulo
- ❌ Vercel está tentando fazer build na raiz, mas o código está em subdiretório
- ⚠️ Aviso sobre submodules Git (não crítico, mas gera ruído)

### 2. **Configuração do Vercel (vercel.json)**
- ⚠️ Configuração atual funciona, mas pode ser otimizada
- ⚠️ Comandos estão corretos, mas podem ser simplificados

### 3. **Package.json Raiz**
- ⚠️ Dependências desnecessárias (axios, node-forge, soap, etc.)
- ✅ Scripts estão corretos

### 4. **Variáveis de Ambiente**
- ❌ Falta arquivo `.env.example`
- ⚠️ Variáveis necessárias não estão documentadas

### 5. **Git Submodules**
- ⚠️ Aviso sobre submodules, mas não há `.gitmodules` configurado
- ℹ️ `apex-auto-glass-erp` tem seu próprio repositório Git

---

## ✅ SOLUÇÕES APLICADAS

### OPÇÃO 1: Usar Root Directory no Vercel (RECOMENDADO)

**No Dashboard do Vercel:**
1. Vá em Settings → General
2. Em "Root Directory", selecione: `apex-auto-glass-erp`
3. Salve

**Vantagens:**
- ✅ Mais simples
- ✅ Vercel detecta automaticamente o framework (Vite)
- ✅ Não precisa de vercel.json na raiz

### OPÇÃO 2: Manter Estrutura Atual (ALTERNATIVA)

Manter o `vercel.json` na raiz com comandos para o subdiretório (já está assim).

---

## 📁 ARQUIVOS QUE SERÃO CORRIGIDOS

1. ✅ `vercel.json` (raiz) - Otimizado
2. ✅ `package.json` (raiz) - Limpo
3. ✅ `.env.example` (criado) - Documentação de variáveis
4. ✅ `apex-auto-glass-erp/.env.example` (criado) - Para o subdiretório

---

## 🔧 CORREÇÕES DETALHADAS

### Arquivo 1: `vercel.json` (Raiz)

**Problema:** Configuração funciona mas pode ser melhorada  
**Solução:** Otimizar comandos e adicionar configurações extras

### Arquivo 2: `package.json` (Raiz)

**Problema:** Dependências desnecessárias  
**Solução:** Remover dependências que não são usadas na raiz

### Arquivo 3: `.env.example` (Raiz e Subdiretório)

**Problema:** Falta documentação de variáveis  
**Solução:** Criar arquivos `.env.example` com todas as variáveis necessárias

---

## 📝 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

### Para o Frontend (Vite)
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

**Onde configurar no Vercel:**
1. Dashboard → Projeto → Settings → Environment Variables
2. Adicione as variáveis acima
3. Selecione os ambientes (Production, Preview, Development)

---

## 🎯 CHECKLIST ANTES DO DEPLOY

### No Vercel Dashboard:
- [ ] Root Directory configurado para `apex-auto-glass-erp` (OPÇÃO 1)
- [ ] OU manter vercel.json na raiz (OPÇÃO 2)
- [ ] Variáveis de ambiente configuradas:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Framework detectado: Vite
- [ ] Build Command: `npm run build` (se usar Root Directory)
- [ ] Output Directory: `dist`

### No Repositório:
- [ ] `vercel.json` atualizado
- [ ] `package.json` limpo
- [ ] `.env.example` criado
- [ ] Commits feitos e push realizado

---

## 🚀 COMANDOS PARA TESTAR LOCALMENTE

```bash
# 1. Navegar para o diretório do projeto
cd apex-auto-glass-erp

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env (copiar do .env.example)
cp .env.example .env
# Editar .env com suas credenciais

# 4. Testar build de produção
npm run build

# 5. Testar servidor de produção
npm run preview

# 6. Se tudo funcionar, fazer commit
cd ..
git add .
git commit -m "fix: corrige configuração para deploy no Vercel"
git push
```

---

## 📊 ESTRUTURA FINAL DO PROJETO

```
apex-glass1.2/
├── apex-auto-glass-erp/          # Projeto principal (Vite + React)
│   ├── src/
│   ├── dist/                     # Output do build
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example              # NOVO
│   └── vercel.json               # Configuração do Vercel (se usar Root Directory)
├── package.json                  # Limpo
├── vercel.json                   # Configuração para monorepo
├── .env.example                  # NOVO
└── DIAGNOSTICO-VERCEL-COMPLETO.md
```

---

## 🎓 CONFIGURAÇÃO RECOMENDADA NO VERCEL

### Configuração Manual (Dashboard):

1. **Root Directory:** `apex-auto-glass-erp`
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build` (detectado automaticamente)
4. **Output Directory:** `dist` (detectado automaticamente)
5. **Install Command:** `npm install` (detectado automaticamente)

### OU usar vercel.json (atual):

O `vercel.json` atual já está configurado corretamente para a estrutura de monorepo.

---

## ⚠️ NOTAS IMPORTANTES

1. **Git Submodules:** O aviso sobre submodules não é crítico. Se quiser remover:
   - Configure `apex-auto-glass-erp` como submódulo Git oficial
   - OU ignore o aviso (não afeta o build)

2. **Root Directory:** A OPÇÃO 1 (usar Root Directory) é mais simples e recomendada.

3. **Variáveis de Ambiente:** Sempre configure no Vercel Dashboard, nunca commite arquivos `.env` com valores reais.

---

## ✅ RESULTADO ESPERADO

Após aplicar todas as correções:

- ✅ Build executa sem erros
- ✅ Deploy completa com sucesso
- ✅ Aplicação funciona corretamente
- ✅ Variáveis de ambiente configuradas
- ✅ Sem avisos críticos no build

---

## 🆘 TROUBLESHOOTING

### Erro: "Missing script: build"
**Solução:** Verifique se o Root Directory está configurado corretamente

### Erro: "Cannot find module"
**Solução:** Verifique se `npm install` está rodando no diretório correto

### Erro: "Environment variables missing"
**Solução:** Configure as variáveis no Vercel Dashboard

### Build funciona mas app não carrega
**Solução:** Verifique se o Output Directory está correto (`dist`)

---

**Última atualização:** $(date)
**Versão:** 1.0.0

