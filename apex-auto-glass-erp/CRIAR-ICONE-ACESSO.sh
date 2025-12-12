#!/bin/bash

# Script para criar ícone de acesso rápido ao Apex Glass ERP
# Este script cria um atalho no menu de aplicativos do sistema

echo "🚀 Criando ícone de acesso rápido para Apex Glass ERP..."

# Caminhos
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$SCRIPT_DIR/Apex-Glass-ERP.desktop"
DESKTOP_APPS_DIR="$HOME/.local/share/applications"
DESKTOP_DESKTOP_DIR="$HOME/Desktop"

# Verificar se o arquivo .desktop existe
if [ ! -f "$DESKTOP_FILE" ]; then
    echo "❌ Arquivo .desktop não encontrado em: $DESKTOP_FILE"
    exit 1
fi

# Criar diretórios se não existirem
mkdir -p "$DESKTOP_APPS_DIR"
mkdir -p "$DESKTOP_DESKTOP_DIR"

# Copiar para o diretório de aplicativos
cp "$DESKTOP_FILE" "$DESKTOP_APPS_DIR/Apex-Glass-ERP.desktop"
chmod +x "$DESKTOP_APPS_DIR/Apex-Glass-ERP.desktop"

# Copiar para a área de trabalho (Desktop)
cp "$DESKTOP_FILE" "$DESKTOP_DESKTOP_DIR/Apex-Glass-ERP.desktop"
chmod +x "$DESKTOP_DESKTOP_DIR/Apex-Glass-ERP.desktop"

# Atualizar cache de aplicativos
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_APPS_DIR"
    echo "✅ Cache de aplicativos atualizado"
fi

echo ""
echo "✅ Ícone de acesso rápido criado com sucesso!"
echo ""
echo "📍 Localizações:"
echo "   - Menu de aplicativos: $DESKTOP_APPS_DIR/Apex-Glass-ERP.desktop"
echo "   - Área de trabalho: $DESKTOP_DESKTOP_DIR/Apex-Glass-ERP.desktop"
echo ""
echo "💡 Dica: Você pode arrastar o ícone da área de trabalho para a barra de tarefas"
echo "   para acesso ainda mais rápido!"

