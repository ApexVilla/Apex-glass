# 📋 Instruções para Aplicar Migração de Análise de Crédito

## ⚠️ IMPORTANTE: Execute na ordem correta!

### Passo 1: Verificar Status (Opcional)
Execute primeiro o script `VERIFICAR-ANTES-DE-APLICAR.sql` para ver o que já está instalado.

### Passo 2: Aplicar Migração Principal
**Execute o script completo `APLICAR-MIGRACAO-CREDITO.sql`**

Como executar:
1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Copie **TODO o conteúdo** do arquivo `APLICAR-MIGRACAO-CREDITO.sql`
5. Cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. **Aguarde a execução completa** - pode levar alguns segundos

### Passo 3: Verificar se funcionou
Execute novamente `VERIFICAR-ANTES-DE-APLICAR.sql` para confirmar que tudo foi criado.

### Passo 4: Testar no Sistema
1. Recarregue a página do sistema
2. Vá em **Financeiro > Análise de Crédito**
3. As vendas devem aparecer agora

---

## ❌ Erros Comuns

### Erro: "column credit_status does not exist"
**Causa**: A migração ainda não foi aplicada  
**Solução**: Execute o Passo 2 acima

### Erro: "relation already exists"
**Causa**: Alguma parte da migração já foi aplicada  
**Solução**: O script usa `IF NOT EXISTS`, então é seguro executar novamente

### Erro: "permission denied"
**Causa**: Você não tem permissão para criar tabelas/funções  
**Solução**: Use uma conta com permissões de administrador no Supabase

---

## ✅ O que o script faz:

1. ✅ Cria a coluna `credit_status` na tabela `sales`
2. ✅ Cria a tabela `credit_limits` (gerencia limites de crédito)
3. ✅ Cria a tabela `credit_logs` (registra análises)
4. ✅ Cria todas as funções necessárias
5. ✅ Cria os triggers automáticos
6. ✅ Configura políticas de segurança (RLS)
7. ✅ Atualiza vendas existentes que precisam de análise

---

## 🔍 Verificar Vendas Após Migração

Execute esta query para ver vendas que precisam de análise:

```sql
SELECT 
  sale_number,
  payment_method,
  credit_status,
  total,
  created_at
FROM public.sales
WHERE credit_status = 'pending'
ORDER BY created_at DESC
LIMIT 20;
```

Se retornar vendas, a migração funcionou! 🎉

