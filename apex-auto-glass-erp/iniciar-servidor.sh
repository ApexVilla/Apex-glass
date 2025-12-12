#!/bin/bash

# Script para iniciar o servidor do Apex Glass ERP
# Use este script se quiser iniciar o servidor manualmente

cd "$(dirname "$0")"

echo "🚀 Apex Glass ERP - Iniciando Servidor"
echo ""

# Verifica se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "❌ Erro: npm não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Verifica se a porta está ocupada
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  A porta 8081 já está em uso!"
    echo ""
    echo "Escolha uma opção:"
    echo "1) Parar o servidor existente e iniciar um novo"
    echo "2) Usar a porta existente (abrir no navegador)"
    echo "3) Cancelar"
    echo ""
    read -p "Digite sua opção (1, 2 ou 3): " opcao
    
    case $opcao in
        1)
            echo "🛑 Parando servidor existente..."
            kill $(lsof -t -i:8081) 2>/dev/null
            sleep 2
            ;;
        2)
            echo "📱 Abrindo no navegador..."
            if command -v xdg-open &> /dev/null; then
                xdg-open "http://localhost:8081" 2>/dev/null &
            elif command -v firefox &> /dev/null; then
                firefox "http://localhost:8081" 2>/dev/null &
            fi
            exit 0
            ;;
        3)
            echo "❌ Cancelado"
            exit 0
            ;;
        *)
            echo "❌ Opção inválida"
            exit 1
            ;;
    esac
fi

echo "✅ Iniciando servidor na porta 8081..."
echo "📱 O sistema estará disponível em:"
echo "   - http://localhost:8081 (neste computador)"
echo "   - http://$(hostname -I | awk '{print $1}'):8081 (outros dispositivos na rede)"
echo ""
echo "🛑 Pressione Ctrl+C para parar o servidor"
echo ""

# Inicia o servidor
npm run dev

