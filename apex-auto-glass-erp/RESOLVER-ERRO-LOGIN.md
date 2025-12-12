# 🔧 Resolver Erro de Login - Passo a Passo

## ❌ Erro Atual
```
GET /rest/v1/profiles?select=company_id,email&id=eq.97c9038d...
[HTTP/3 400]
```

## ✅ Solução em 3 Passos

### PASSO 1: Verificar se o Profile foi Criado

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute este SQL:

```sql
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.role,
  c.name as company_name
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
WHERE p.email = 'villarroelsamir85@gmail.com';
```

**Resultado esperado:**
- ✅ Se retornar dados: Profile existe, vá para PASSO 2
- ❌ Se não retornar nada: Profile NÃO foi criado, vá para PASSO 3

---

### PASSO 2: Aplicar Correção RLS (Se Profile Existe)

1. No **Supabase Dashboard > SQL Editor**
2. Execute o arquivo: `CORRECAO-URGENTE-RLS.sql`

Ou copie e cole este SQL:

```sql
-- Remove políticas antigas
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Permite ver o próprio profile (ESSENCIAL para login)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Permite ver profiles da mesma empresa
CREATE POLICY "Users can view profiles in their company"
ON public.profiles FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL 
  AND company_id = (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- Corrigir política de companies
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company or search by name" ON public.companies;

CREATE POLICY "Users can view their company or search by name"
ON public.companies FOR SELECT
TO authenticated
USING (
  id = public.get_user_company_id()
  OR
  true
);
```

3. Clique em **Run**
4. Tente fazer login novamente

---

### PASSO 3: Criar Profile Manualmente (Se Não Existe)

Se o profile não foi criado, você precisa criá-lo manualmente:

1. No **Supabase Dashboard > SQL Editor**
2. Execute este SQL (substitua os valores):

```sql
-- Primeiro, descubra o ID do usuário no Auth
-- Vá em Authentication > Users e encontre o email
-- Ou execute:
SELECT id, email FROM auth.users WHERE email = 'villarroelsamir85@gmail.com';

-- Depois, descubra o ID da empresa
SELECT id, name FROM public.companies WHERE name ILIKE '%apexvilla%';

-- Agora crie o profile (substitua os UUIDs pelos valores acima)
INSERT INTO public.profiles (
  id,           -- UUID do usuário do auth.users
  company_id,   -- UUID da empresa
  email,
  full_name,
  role
) VALUES (
  'UUID_DO_USUARIO',      -- Substitua pelo ID do auth.users
  'UUID_DA_EMPRESA',      -- Substitua pelo ID da empresa
  'villarroelsamir85@gmail.com',
  'Seu Nome Completo',
  'admin'
);

-- Criar role de admin
INSERT INTO public.user_roles (
  user_id,
  role,
  company_id
) VALUES (
  'UUID_DO_USUARIO',      -- Mesmo UUID do usuário
  'admin',
  'UUID_DA_EMPRESA'       -- Mesmo UUID da empresa
);
```

---

## 🔍 Verificar se Funcionou

Após aplicar as correções:

1. **Recarregue a página** do sistema (F5)
2. **Tente fazer login** novamente:
   - Email: `villarroelsamir85@gmail.com`
   - Senha: sua senha
   - Empresa: `apexvilla` ou `Apex Villa`
3. Se ainda der erro, verifique o console do navegador (F12)

---

## ⚠️ Se Ainda Não Funcionar

1. Verifique se o **usuário existe** em `auth.users`
2. Verifique se a **empresa existe** em `companies`
3. Verifique se o **profile foi criado** corretamente
4. Verifique se as **políticas RLS foram aplicadas**

---

## 📞 Próximos Passos

Se tudo estiver correto e ainda não funcionar:
- Verifique os logs do Supabase
- Verifique se há outros erros no console
- Tente criar uma nova empresa pelo signup novamente

