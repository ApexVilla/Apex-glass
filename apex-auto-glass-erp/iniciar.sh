#!/bin/bash

# Script simples para iniciar o Apex Glass ERP
# Inicia o servidor e abre o navegador automaticamente

cd "$(dirname "$0")"

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

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Verifica se o servidor já está rodando
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Servidor já está rodando na porta 8081"
    echo "📱 Abrindo navegador..."
    
    # Tenta abrir no navegador
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8081" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "http://localhost:8081" 2>/dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "http://localhost:8081" 2>/dev/null &
    elif command -v chromium &> /dev/null; then
        chromium "http://localhost:8081" 2>/dev/null &
    fi
    
    echo ""
    echo "✅ Sistema disponível em:"
    echo "   - http://localhost:8081"
    echo "   - http://${LOCAL_IP}:8081"
    echo ""
    exit 0
fi

echo "🚀 Iniciando Apex Glass ERP..."
echo ""

# Inicia o servidor em background
npm run dev > /tmp/apex-glass-server.log 2>&1 &
SERVER_PID=$!

# Aguarda o servidor iniciar
echo "⏳ Aguardando servidor iniciar..."
for i in {1..30}; do
    if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Servidor iniciado!"
        sleep 1
        
        # Abre o navegador
        echo "📱 Abrindo navegador..."
        if command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:8081" 2>/dev/null &
        elif command -v firefox &> /dev/null; then
            firefox "http://localhost:8081" 2>/dev/null &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "http://localhost:8081" 2>/dev/null &
        elif command -v chromium &> /dev/null; then
            chromium "http://localhost:8081" 2>/dev/null &
        fi
        
        echo ""
        echo "✅ Sistema iniciado com sucesso!"
        echo "📱 Acesse:"
        echo "   - http://localhost:8081"
        echo "   - http://${LOCAL_IP}:8081"
        echo ""
        echo "📋 Logs: tail -f /tmp/apex-glass-server.log"
        echo "🛑 Para parar: kill $SERVER_PID"
        echo ""
        
        # Aguarda o processo do servidor
        wait $SERVER_PID
        exit 0
    fi
    sleep 1
done

# Se chegou aqui, o servidor não iniciou
echo "❌ Erro: Servidor não iniciou após 30 segundos"
echo "📋 Verifique os logs:"
cat /tmp/apex-glass-server.log
kill $SERVER_PID 2>/dev/null
exit 1

