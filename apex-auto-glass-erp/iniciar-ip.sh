#!/bin/bash

# Script para iniciar o ERP Apex Auto Glass
# Oferece opção de abrir pelo IP ou localhost após iniciar
# Uso: ./iniciar-ip.sh

cd "$(dirname "$0")"

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "🚀 Iniciando o ERP Apex Auto Glass..."
echo ""

# Verifica se o servidor já está rodando
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Servidor já está rodando na porta 8081"
    echo ""
    echo "Escolha como deseja acessar:"
    echo ""
    echo "1) Pelo IP (http://${LOCAL_IP}:8081)"
    echo "2) Pelo Localhost (http://localhost:8081)"
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
    
    # Tenta abrir no navegador
    if command -v xdg-open &> /dev/null; then
        xdg-open "${URL}" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "${URL}" 2>/dev/null &
    fi
    
    exit 0
fi

echo "✅ Iniciando servidor de desenvolvimento..."
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
echo "🛑 Pressione Ctrl+C para parar o servidor"
echo "📱 O sistema será aberto em: ${URL}"
echo ""

# Inicia o servidor de desenvolvimento em background e abre o navegador após um delay
(npm run dev > /dev/null 2>&1 &)
sleep 3

# Abre o navegador
if command -v xdg-open &> /dev/null; then
    xdg-open "${URL}" 2>/dev/null &
elif command -v firefox &> /dev/null; then
    firefox "${URL}" 2>/dev/null &
fi

# Aguarda o processo do servidor
wait

