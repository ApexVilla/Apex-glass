#!/bin/bash

echo "🔧 Corrigindo problema do Git Submodule..."

# 1. Remove a referência de submodule do index do git
# O erro "Failed to fetch git submodules" acontece porque o git acha que essa pasta é um repositório separado
git rm --cached apex-auto-glass-erp

# 2. Adiciona a pasta como arquivos normais
echo "📂 Adicionando arquivos reais ao Git..."
git add apex-auto-glass-erp/*

# 3. Commit da correção
echo "💾 Salvando correção..."
git commit -m "fix: convert submodule to regular directory"

echo "✅ Correção do Git aplicada!"
echo "⚠️ IMPORTANTE: Não esqueça de mudar o 'Root Directory' na Vercel para 'apex-auto-glass-erp'!"
