#!/bin/bash

# Script para testar RLS (Row Level Security)
# Este script verifica se as policies RLS estão funcionando corretamente

echo "🔒 Testando Row Level Security (RLS)"
echo "===================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Erro: Variáveis de ambiente não configuradas${NC}"
    echo "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo -e "${YELLOW}📋 Checklist RLS:${NC}"
echo ""

# 1. Verificar se RLS está habilitado
echo "1. Verificando se RLS está habilitado nas tabelas..."
echo "   Execute no Supabase SQL Editor:"
echo "   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('tenants', 'profiles', 'produtos', 'vendas', 'fornecedores', 'contas_receber');"
echo ""

# 2. Verificar policies
echo "2. Verificando policies criadas..."
echo "   Execute no Supabase SQL Editor:"
echo "   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';"
echo ""

# 3. Testar isolamento de dados
echo "3. Para testar isolamento de dados:"
echo "   a) Crie dois usuários em tenants diferentes"
echo "   b) Faça login com cada usuário"
echo "   c) Verifique se cada usuário só vê dados do seu tenant"
echo ""

# 4. Verificar função get_user_tenant_id
echo "4. Verificando função get_user_tenant_id..."
echo "   Execute no Supabase SQL Editor (como usuário autenticado):"
echo "   SELECT public.get_user_tenant_id();"
echo ""

echo -e "${GREEN}✅ Checklist completo!${NC}"
echo ""
echo "💡 Dicas:"
echo "   - Use o Supabase Dashboard → SQL Editor para executar as queries acima"
echo "   - Teste com diferentes usuários para verificar isolamento"
echo "   - Verifique os logs do Supabase para erros de RLS"

