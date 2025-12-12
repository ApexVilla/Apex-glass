#!/bin/bash

# Script para abrir o Apex Glass ERP no navegador
# Oferece opção de abrir pelo IP ou localhost
# Uso: ./abrir-apex-glass.sh

# Detecta o IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "🚀 Abrindo Apex Glass ERP..."
echo ""
echo "Escolha como deseja acessar:"
echo ""
echo "1) Pelo IP (${LOCAL_IP}:8081) - Para acessar de outros dispositivos na rede"
echo "2) Pelo Localhost (localhost:8081) - Apenas neste computador"
echo ""
read -p "Digite sua opção (1 ou 2): " opcao

case $opcao in
    1)
        URL="http://${LOCAL_IP}:8081"
        echo ""
        echo "📱 Abrindo pelo IP: ${URL}"
        ;;
    2)
        URL="http://localhost:8081"
        echo ""
        echo "📱 Abrindo pelo Localhost: ${URL}"
        ;;
    *)
        echo ""
        echo "❌ Opção inválida! Usando IP por padrão."
        URL="http://${LOCAL_IP}:8081"
        ;;
esac

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

