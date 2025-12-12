#!/bin/bash

# Script para abrir o ERP Apex Auto Glass
# Uso: ./abrir-erp.sh

cd "$(dirname "$0")"

echo "🚀 Iniciando o ERP Apex Auto Glass..."
echo ""

# Verifica se a pasta dist existe
if [ ! -d "dist" ]; then
    echo "⚠️  A pasta 'dist' não existe. Fazendo build..."
    npm run build
    echo ""
fi

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "✅ Abrindo servidor na porta 8081..."
echo "📱 Acesse pelo IP: http://${LOCAL_IP}:8081"
echo "📱 Ou pelo localhost: http://localhost:8081"
echo "🛑 Pressione Ctrl+C para parar o servidor"
echo ""

npm run start

