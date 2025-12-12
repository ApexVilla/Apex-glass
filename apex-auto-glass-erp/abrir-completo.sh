#!/bin/bash

# Script que inicia o servidor E abre o navegador automaticamente

cd "$(dirname "$0")"

echo "🚀 Iniciando o ERP Apex Auto Glass..."
echo ""

# Inicia o servidor em background
npm run dev > /dev/null 2>&1 &

# Aguarda o servidor iniciar
sleep 4

# Abre o navegador
echo "🌐 Abrindo navegador..."
xdg-open http://localhost:8080 2>/dev/null || \
  firefox http://localhost:8080 2>/dev/null || \
  google-chrome http://localhost:8080 2>/dev/null || \
  chromium-browser http://localhost:8080 2>/dev/null || \
  echo "⚠️  Abra manualmente: http://localhost:8080"

echo ""
echo "✅ Servidor rodando em: http://localhost:8080"
echo "🛑 Para parar: pkill -f 'vite|npm.*dev'"
echo ""

# Mantém o script rodando para mostrar logs
wait

