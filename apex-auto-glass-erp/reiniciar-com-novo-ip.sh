#!/bin/bash

# Script para reiniciar o servidor após mudança de IP

cd "$(dirname "$0")"

echo "🔄 Reiniciando servidor com novo IP..."
echo ""

# Detecta o novo IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "📡 Novo IP detectado: ${LOCAL_IP}"
echo ""

# Para processos antigos na porta 8081
echo "🛑 Parando servidor antigo..."
pkill -f "vite.*8081" 2>/dev/null
pkill -f "node.*8081" 2>/dev/null
sleep 2

# Verifica se ainda há processos
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Ainda há processos na porta 8081, forçando parada..."
    lsof -ti :8081 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Inicia o servidor novamente
echo "🚀 Iniciando servidor com novo IP..."
echo ""

npm run dev > /tmp/apex-glass-server.log 2>&1 &
SERVER_PID=$!

# Aguarda o servidor iniciar
echo "⏳ Aguardando servidor iniciar..."
for i in {1..30}; do
    if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
        if curl -s http://localhost:8081 > /dev/null 2>&1; then
            echo ""
            echo "✅ Servidor reiniciado com sucesso!"
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
            echo ""
            exit 0
        fi
    fi
    sleep 1
done

echo "❌ Erro: Servidor não iniciou após 30 segundos"
echo "📋 Verifique os logs:"
cat /tmp/apex-glass-server.log
exit 1

