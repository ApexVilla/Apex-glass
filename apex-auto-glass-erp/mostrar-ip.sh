#!/bin/bash

# Script para mostrar o IP atual e acessar o sistema

cd "$(dirname "$0")"

# Detecta o IP atual
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "═══════════════════════════════════════════════════════════"
echo "  🌐 APEX GLASS ERP - Informações de Acesso"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verifica se o servidor está rodando
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Servidor está RODANDO"
    echo ""
    echo "📡 Seu IP atual: ${LOCAL_IP}"
    echo ""
    echo "🌐 Acesse o sistema em:"
    echo "   👉 http://${LOCAL_IP}:8081"
    echo "   👉 http://localhost:8081"
    echo ""
    
    # Testa se responde
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        echo "✅ Servidor respondendo corretamente!"
        echo ""
        read -p "Deseja abrir no navegador agora? (s/n): " abrir
        if [ "$abrir" = "s" ] || [ "$abrir" = "S" ]; then
            if command -v xdg-open &> /dev/null; then
                xdg-open "http://${LOCAL_IP}:8081" 2>/dev/null &
                echo "✅ Abrindo navegador..."
            elif command -v firefox &> /dev/null; then
                firefox "http://${LOCAL_IP}:8081" 2>/dev/null &
                echo "✅ Abrindo navegador..."
            else
                echo "⚠️  Navegador não encontrado. Acesse manualmente:"
                echo "   http://${LOCAL_IP}:8081"
            fi
        fi
    else
        echo "⚠️  Servidor não está respondendo"
        echo "🔄 Execute: ./reiniciar-com-novo-ip.sh"
    fi
else
    echo "❌ Servidor NÃO está rodando"
    echo ""
    echo "📡 Seu IP atual: ${LOCAL_IP}"
    echo ""
    echo "🚀 Para iniciar o servidor, execute:"
    echo "   ./iniciar.sh"
    echo "   ou"
    echo "   ./reiniciar-com-novo-ip.sh"
    echo ""
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

