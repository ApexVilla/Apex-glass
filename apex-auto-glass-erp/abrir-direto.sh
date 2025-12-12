#!/bin/bash

# Script simplificado para abrir o Apex Glass ERP diretamente
# Abre no navegador padrão sem perguntas

cd "$(dirname "$0")"

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')
URL="http://localhost:8081"

# Função para verificar se o servidor está rodando
check_server() {
    lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Função para aguardar o servidor iniciar
wait_for_server() {
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_server; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

# Verifica se o servidor já está rodando
if check_server; then
    echo "✅ Servidor já está rodando"
    # Abre no navegador
    if command -v xdg-open &> /dev/null; then
        xdg-open "${URL}" 2>/dev/null &
    elif command -v gnome-open &> /dev/null; then
        gnome-open "${URL}" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "${URL}" 2>/dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "${URL}" 2>/dev/null &
    elif command -v chromium &> /dev/null; then
        chromium "${URL}" 2>/dev/null &
    fi
    exit 0
fi

# Servidor não está rodando, inicia
echo "🚀 Iniciando servidor Apex Glass ERP..."
echo "⏳ Aguarde alguns segundos..."

# Verifica se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "❌ Erro: npm não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Inicia o servidor em background
nohup npm run dev > /tmp/apex-glass-server.log 2>&1 &
SERVER_PID=$!

# Aguarda o servidor iniciar
echo "⏳ Aguardando servidor iniciar..."
if wait_for_server; then
    echo "✅ Servidor iniciado com sucesso!"
    echo "📱 Abrindo no navegador..."
    
    # Aguarda mais um pouco para garantir que está totalmente pronto
    sleep 2
    
    # Abre no navegador padrão
    if command -v xdg-open &> /dev/null; then
        xdg-open "${URL}" 2>/dev/null &
    elif command -v gnome-open &> /dev/null; then
        gnome-open "${URL}" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "${URL}" 2>/dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "${URL}" 2>/dev/null &
    elif command -v chromium &> /dev/null; then
        chromium "${URL}" 2>/dev/null &
    else
        echo "⚠️  Não foi possível abrir o navegador automaticamente."
        echo "📱 Abra manualmente: ${URL}"
    fi
    
    echo ""
    echo "💡 Dica: Para parar o servidor, execute: kill $SERVER_PID"
    echo "📋 Logs do servidor: /tmp/apex-glass-server.log"
else
    echo "❌ Erro: Servidor não iniciou após 30 segundos"
    echo "📋 Verifique os logs: /tmp/apex-glass-server.log"
    echo ""
    echo "Tente iniciar manualmente:"
    echo "  cd $(pwd)"
    echo "  npm run dev"
    exit 1
fi

