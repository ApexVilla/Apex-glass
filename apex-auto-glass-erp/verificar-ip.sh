#!/bin/bash

# Script para verificar e corrigir problemas de acesso após mudança de IP

cd "$(dirname "$0")"

echo "🔍 Verificando configuração do sistema..."
echo ""

# Detecta o IP atual
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "📡 IP atual detectado: ${LOCAL_IP}"
echo ""

# Verifica se o servidor está rodando
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Servidor está rodando na porta 8081"
    echo ""
    echo "🌐 URLs disponíveis:"
    echo "   - http://localhost:8081"
    echo "   - http://${LOCAL_IP}:8081"
    echo ""
    
    # Testa se o servidor responde
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        echo "✅ Servidor respondendo corretamente!"
        echo ""
        echo "📱 Tente acessar:"
        echo "   http://${LOCAL_IP}:8081"
        echo ""
        
        # Pergunta se quer abrir no navegador
        read -p "Deseja abrir no navegador? (s/n): " abrir
        if [ "$abrir" = "s" ] || [ "$abrir" = "S" ]; then
            if command -v xdg-open &> /dev/null; then
                xdg-open "http://${LOCAL_IP}:8081" 2>/dev/null &
            elif command -v firefox &> /dev/null; then
                firefox "http://${LOCAL_IP}:8081" 2>/dev/null &
            fi
        fi
    else
        echo "⚠️  Servidor não está respondendo"
        echo "🔄 Reiniciando servidor..."
        echo ""
        
        # Mata processos na porta 8081
        pkill -f "vite.*8081" 2>/dev/null
        pkill -f "node.*8081" 2>/dev/null
        sleep 2
        
        echo "🚀 Iniciando servidor novamente..."
        npm run dev > /tmp/apex-glass-server.log 2>&1 &
        sleep 5
        
        if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Servidor reiniciado com sucesso!"
            echo "📱 Acesse: http://${LOCAL_IP}:8081"
        else
            echo "❌ Erro ao reiniciar servidor"
            echo "📋 Verifique os logs: tail -f /tmp/apex-glass-server.log"
        fi
    fi
else
    echo "❌ Servidor não está rodando"
    echo ""
    echo "🚀 Iniciando servidor..."
    echo ""
    
    # Inicia o servidor
    npm run dev > /tmp/apex-glass-server.log 2>&1 &
    SERVER_PID=$!
    
    # Aguarda iniciar
    echo "⏳ Aguardando servidor iniciar..."
    for i in {1..30}; do
        if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Servidor iniciado!"
            echo ""
            echo "🌐 URLs disponíveis:"
            echo "   - http://localhost:8081"
            echo "   - http://${LOCAL_IP}:8081"
            echo ""
            
            # Abre no navegador
            read -p "Deseja abrir no navegador? (s/n): " abrir
            if [ "$abrir" = "s" ] || [ "$abrir" = "S" ]; then
                if command -v xdg-open &> /dev/null; then
                    xdg-open "http://${LOCAL_IP}:8081" 2>/dev/null &
                elif command -v firefox &> /dev/null; then
                    firefox "http://${LOCAL_IP}:8081" 2>/dev/null &
                fi
            fi
            
            echo ""
            echo "📋 Logs: tail -f /tmp/apex-glass-server.log"
            echo "🛑 Para parar: kill $SERVER_PID"
            exit 0
        fi
        sleep 1
    done
    
    echo "❌ Erro: Servidor não iniciou após 30 segundos"
    echo "📋 Verifique os logs:"
    cat /tmp/apex-glass-server.log
    exit 1
fi

