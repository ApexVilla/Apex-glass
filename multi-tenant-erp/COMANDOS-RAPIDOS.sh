#!/bin/bash

# Script para iniciar o servidor rapidamente
# Uso: ./COMANDOS-RAPIDOS.sh

echo "🚀 Iniciando Multi-Tenant ERP..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (multi-tenant-erp/)"
    exit 1
fi

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚠️  Arquivo .env.local não encontrado!"
    echo ""
    echo "Criando arquivo .env.local..."
    cat > .env.local << 'EOF'
# Configure estas variáveis com suas credenciais do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
    echo "✅ Arquivo .env.local criado!"
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env.local com suas credenciais do Supabase!"
    echo "   Obtenha em: https://supabase.com/dashboard → Seu Projeto → Settings → API"
    echo ""
    read -p "Pressione ENTER após configurar o .env.local..."
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Verificar se porta 3000 está em uso
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Porta 3000 já está em uso!"
    echo "   Matando processo na porta 3000..."
    kill -9 $(lsof -ti:3000) 2>/dev/null
    sleep 2
fi

echo "✅ Iniciando servidor..."
echo ""
echo "🌐 Acesse: http://localhost:3000"
echo "📝 Signup: http://localhost:3000/signup"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar servidor
npm run dev

