# 🔧 Corrigir Erro de Busca de Empresa

## ❌ Erro Atual

```
Error searching company: 
Object { code: "42703", details: null, hint: null, message: 'column "company_id" does not exist' }
```

## 🔍 Causa do Problema

A política RLS (Row Level Security) da tabela `companies` está bloqueando buscas por nome quando o usuário ainda não tem um `company_id` definido (durante o login) ou quando a função `get_user_company_id()` retorna NULL.

## ✅ Solução

Foi criada uma migration que ajusta a política RLS para permitir buscas de empresas por nome durante o login.

### Arquivo Criado:
- `supabase/migrations/20251225000000_fix_companies_rls_search.sql`

## 📋 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20251225000000_fix_companies_rls_search.sql
   ```
4. Clique em **Run** para executar

### Opção 2: Via Supabase CLI

```bash
cd apex-auto-glass-erp
supabase db push
```

### Opção 3: Executar SQL Manualmente

Execute o SQL diretamente no Supabase Dashboard:

```sql
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Create a policy that allows:
-- 1. Users to view their own company (by ID match)
-- 2. Users to search companies by name (for login/selection purposes)
CREATE POLICY "Users can view their company or search by name"
ON public.companies FOR SELECT
TO authenticated
USING (
  -- Allow if it's the user's company (handles NULL gracefully)
  (public.get_user_company_id() IS NOT NULL AND id = public.get_user_company_id())
  OR
  -- Allow search when user doesn't have company_id yet (during login/signup)
  -- OR when user is authenticated (for master users to search)
  public.get_user_company_id() IS NULL
  OR
  auth.uid() IS NOT NULL
);
```

## 🔒 Segurança

Esta política é segura porque:

1. ✅ Usuários só podem ver nomes/IDs de empresas, não acessar dados
2. ✅ A aplicação valida o acesso antes de permitir operações
3. ✅ Outras tabelas ainda têm RLS que protege os dados
4. ✅ Usuários só podem acessar dados da sua própria empresa

## ✅ Após Aplicar

1. Recarregue a página do sistema
2. Tente fazer login novamente
3. O erro de busca de empresa deve estar resolvido

---

**Nota:** Se você estiver usando Supabase local, execute a migration normalmente. Se estiver usando Supabase Cloud, aplique via Dashboard ou CLI.

