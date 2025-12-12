#!/bin/bash

# Script principal para abrir o Apex Glass ERP
# Oferece opção de abrir pelo IP ou localhost
# Uso: ./abrir-sistema.sh

cd "$(dirname "$0")"

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

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

echo "🚀 Apex Glass ERP"
echo ""

# Verifica se o servidor já está rodando
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Servidor já está rodando na porta 8081"
    echo ""
    echo "Escolha como deseja acessar:"
    echo ""
    echo "1) Pelo IP (http://${LOCAL_IP}:8081) - Para acessar de outros dispositivos"
    echo "2) Pelo Localhost (http://localhost:8081) - Apenas neste computador"
    echo ""
    read -p "Digite sua opção (1 ou 2): " opcao
    
    case $opcao in
        1)
            URL="http://${LOCAL_IP}:8081"
            ;;
        2)
            URL="http://localhost:8081"
            ;;
        *)
            URL="http://${LOCAL_IP}:8081"
            ;;
    esac
    
    echo ""
    echo "📱 Abrindo: ${URL}"
    echo ""
    
    # Tenta abrir no navegador
    if command -v xdg-open &> /dev/null; then
        xdg-open "${URL}" 2>/dev/null &
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
    
    exit 0
fi

echo "Escolha uma opção:"
echo ""
echo "1) Abrir no navegador (servidor já está rodando)"
echo "2) Iniciar servidor e abrir no navegador"
echo ""
read -p "Digite sua opção (1 ou 2): " escolha

case $escolha in
    1)
        echo ""
        echo "Escolha como deseja acessar:"
        echo ""
        echo "1) Pelo IP (http://${LOCAL_IP}:8081) - Para acessar de outros dispositivos"
        echo "2) Pelo Localhost (http://localhost:8081) - Apenas neste computador"
        echo ""
        read -p "Digite sua opção (1 ou 2): " opcao
        
        case $opcao in
            1)
                URL="http://${LOCAL_IP}:8081"
                ;;
            2)
                URL="http://localhost:8081"
                ;;
            *)
                URL="http://${LOCAL_IP}:8081"
                ;;
        esac
        
        echo ""
        echo "📱 Abrindo: ${URL}"
        echo ""
        
        # Tenta abrir no navegador padrão
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
        ;;
    2)
        echo ""
        echo "Escolha como deseja acessar quando o servidor iniciar:"
        echo ""
        echo "1) Pelo IP (http://${LOCAL_IP}:8081) - Para acessar de outros dispositivos"
        echo "2) Pelo Localhost (http://localhost:8081) - Apenas neste computador"
        echo ""
        read -p "Digite sua opção (1 ou 2): " opcao
        
        case $opcao in
            1)
                URL="http://${LOCAL_IP}:8081"
                ;;
            2)
                URL="http://localhost:8081"
                ;;
            *)
                URL="http://${LOCAL_IP}:8081"
                ;;
        esac
        
        echo ""
        echo "✅ Iniciando servidor de desenvolvimento..."
        echo "🛑 Pressione Ctrl+C para parar o servidor"
        echo "📱 O sistema será aberto em: ${URL}"
        echo ""
        
        # Inicia o servidor em background
        npm run dev > /tmp/apex-glass-server.log 2>&1 &
        SERVER_PID=$!
        
        # Aguarda o servidor iniciar (verifica se a porta está ouvindo)
        echo "⏳ Aguardando servidor iniciar..."
        for i in {1..30}; do
            if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo "✅ Servidor iniciado com sucesso!"
                sleep 2
                
                # Abre o navegador
                if command -v xdg-open &> /dev/null; then
                    xdg-open "${URL}" 2>/dev/null &
                elif command -v firefox &> /dev/null; then
                    firefox "${URL}" 2>/dev/null &
                elif command -v google-chrome &> /dev/null; then
                    google-chrome "${URL}" 2>/dev/null &
                elif command -v chromium &> /dev/null; then
                    chromium "${URL}" 2>/dev/null &
                fi
                
                echo ""
                echo "✅ Servidor rodando! Acesse: ${URL}"
                echo "📋 Logs do servidor: tail -f /tmp/apex-glass-server.log"
                echo "🛑 Para parar: kill $SERVER_PID ou Ctrl+C"
                echo ""
                
                # Aguarda o processo do servidor
                wait $SERVER_PID
                exit 0
            fi
            sleep 1
        done
        
        # Se chegou aqui, o servidor não iniciou
        echo "❌ Erro: Servidor não iniciou após 30 segundos"
        echo "📋 Verifique os logs: cat /tmp/apex-glass-server.log"
        kill $SERVER_PID 2>/dev/null
        exit 1
        ;;
    *)
        echo ""
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac
