#!/bin/bash

# Script para atualizar a SERVICE_ROLE_KEY

SERVICE_ROLE_KEY="sb_secret_rs4hpXzaIz3JLPi5xlrC9A_XJ6kQ6w2"

# Ler o arquivo atual
if [ -f .env.local ]; then
    # Substituir a linha SUPABASE_SERVICE_ROLE_KEY
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" .env.local
    echo "✅ SERVICE_ROLE_KEY atualizada no .env.local"
else
    echo "❌ Arquivo .env.local não encontrado"
fi

echo ""
echo "⚠️  IMPORTANTE:"
echo "A chave que você forneceu parece ser uma chave 'publishable' (formato sb_)."
echo "Para o signup funcionar, normalmente precisamos da chave 'service_role' (formato JWT, começa com eyJ)."
echo ""
echo "Se ainda der erro 'Invalid API key', você precisa:"
echo "1. Ir no Supabase Dashboard → Settings → API"
echo "2. Encontrar a chave 'service_role' (secret)"
echo "3. Clicar no ícone de olho para revelar"
echo "4. Copiar a chave completa (é muito longa e começa com eyJ...)"
echo "5. Substituir no .env.local"
echo ""
echo "Depois de atualizar, reinicie o servidor: npm run dev"

