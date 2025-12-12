#!/bin/bash

echo "🚀 Iniciando correções para Deploy na Vercel..."

# 1. Remover .git aninhado (já feito pelo agente, mas garantindo)
if [ -d "apex-auto-glass-erp/.git" ]; then
    echo "🗑️  Removendo .git aninhado..."
    rm -rf apex-auto-glass-erp/.git
else
    echo "✅ .git aninhado já removido."
fi

# 2. Adicionar novos arquivos ao git
echo "📦 Adicionando arquivos corrigidos ao Git..."
git add apex-auto-glass-erp/vercel.json
git add apex-auto-glass-erp/.env.example
git add DIAGNOSTICO_VERCEL.md

# 3. Commit
echo "💾 Criando commit de correção..."
git commit -m "fix(vercel): remove nested git, update vercel.json and add env example"

echo "✅ Correções aplicadas e commitadas!"
echo "👉 AGORA: Vá ao painel da Vercel e mude o Root Directory para 'apex-auto-glass-erp'."
echo "👉 Em seguida, faça 'git push' para enviar as alterações."
