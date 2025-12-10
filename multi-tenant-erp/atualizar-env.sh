#!/bin/bash

# Script para atualizar o .env.local com as chaves do Supabase

cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxsgponcxnmwkqnrktel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c2dwb25jeG5td2txbnJrdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTU0MDAsImV4cCI6MjA3OTk5MTQwMH0.NO9Xi27KqMxvp9RJGcy4rGiiAtaticEAp_sCvG6XeqM
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_CHAVE_SERVICE_ROLE_DO_SUPABASE
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF

echo "✅ Arquivo .env.local atualizado!"
echo ""
echo "⚠️  IMPORTANTE: Você ainda precisa adicionar a SERVICE_ROLE_KEY!"
echo ""
echo "1. Acesse: https://supabase.com/dashboard"
echo "2. Vá em: Settings → API"
echo "3. Copie a chave 'service_role' (secret)"
echo "4. Edite o arquivo .env.local e substitua:"
echo "   SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_CHAVE_SERVICE_ROLE_DO_SUPABASE"
echo "   pela chave real que você copiou"
echo ""
echo "5. Depois reinicie o servidor: npm run dev"

