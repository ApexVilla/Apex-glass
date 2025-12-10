# 🏢 GUIA: Como Cadastrar Empresas (Tenants)

Este guia explica todas as formas de cadastrar empresas no sistema multi-tenant.

## 📋 Formas de Cadastrar Empresas

### 1️⃣ **Cadastro Automático via Signup** (Recomendado)

**Como funciona:**
Quando um usuário cria uma conta pela primeira vez, o sistema automaticamente:
1. Cria uma nova empresa (tenant)
2. Cria o usuário no Supabase Auth
3. Cria o profile ligando o usuário à empresa

**Passo a passo:**

1. Acesse: `http://localhost:3000/signup` (ou sua URL de produção)
2. Preencha o formulário:
   - **Nome da Empresa**: Ex: "Minha Empresa Ltda"
   - **Slug**: Ex: "minha-empresa" (será gerado automaticamente)
   - **Seu Nome Completo**: Ex: "João Silva"
   - **Email**: Ex: "joao@empresa.com"
   - **Senha**: Mínimo 6 caracteres
3. Clique em "Criar conta"

**Resultado:**
- ✅ Empresa criada na tabela `tenants`
- ✅ Usuário criado no Supabase Auth
- ✅ Profile criado ligando usuário → empresa
- ✅ Usuário é automaticamente **admin** da empresa

**Código responsável:**
- Frontend: `app/signup/page.tsx`
- Backend: `app/api/auth/signup/route.ts`

---

### 2️⃣ **Cadastro Manual via Supabase SQL**

Use esta forma se precisar criar empresas diretamente no banco de dados.

**Passo a passo:**

1. Acesse: Supabase Dashboard → SQL Editor
2. Execute o SQL:

```sql
-- Criar nova empresa
INSERT INTO public.tenants (id, name, slug, email, phone, address, cnpj, is_active)
VALUES (
  gen_random_uuid(),  -- UUID automático
  'Nova Empresa Ltda',
  'nova-empresa',     -- Deve ser único!
  'contato@novaempresa.com',
  '(11) 1234-5678',
  'Rua Exemplo, 123',
  '12.345.678/0001-90',
  true
)
RETURNING id, name, slug;
```

3. Anote o `id` retornado (você precisará para criar o profile)

4. Agora crie o usuário no Supabase Auth:
   - Vá em: Authentication → Users → Add User
   - Preencha email e senha
   - Anote o UUID do usuário criado

5. Crie o profile ligando usuário → empresa:

```sql
-- Criar profile ligando usuário à empresa
INSERT INTO public.profiles (id, tenant_id, email, full_name, role, is_active)
VALUES (
  'uuid-do-usuario-criado-no-auth',  -- UUID do usuário do Supabase Auth
  'uuid-da-empresa-criada',          -- UUID da empresa criada acima
  'usuario@novaempresa.com',
  'Nome do Usuário',
  'admin',  -- ou 'user', 'manager'
  true
);
```

---

### 3️⃣ **Cadastro via API (Programático)**

Se você quiser criar empresas via código/script.

**Exemplo em TypeScript:**

```typescript
import { createServiceRoleClient } from '@/lib/supabaseServer'

async function criarEmpresa() {
  const supabase = createServiceRoleClient()
  
  // 1. Criar empresa
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Nova Empresa',
      slug: 'nova-empresa',
      email: 'contato@empresa.com',
    })
    .select()
    .single()
  
  if (tenantError) throw tenantError
  
  // 2. Criar usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@empresa.com',
    password: 'senha123',
    email_confirm: true,
  })
  
  if (authError) throw authError
  
  // 3. Criar profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email: 'admin@empresa.com',
      full_name: 'Admin da Empresa',
      role: 'admin',
    })
  
  if (profileError) throw profileError
  
  console.log('Empresa criada com sucesso!', tenant.id)
}
```

---

## 👥 Adicionar Usuários a uma Empresa Existente

### Opção 1: Via Interface (Recomendado criar página)

Você pode criar uma página `/dashboard/usuarios` para adicionar usuários. Exemplo:

```typescript
// app/dashboard/usuarios/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function AdicionarUsuarioPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    // Buscar tenant_id do usuário logado
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) return
    
    // Criar usuário no Auth (precisa ser via API com service_role)
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        tenantId: profile.tenant_id,
      }),
    })
    
    // ... resto do código
  }
  
  // ... JSX
}
```

### Opção 2: Via Supabase Dashboard

1. **Criar usuário no Auth:**
   - Supabase Dashboard → Authentication → Users → Add User
   - Preencha email e senha
   - Anote o UUID do usuário

2. **Criar profile no SQL Editor:**

```sql
-- Substitua os valores abaixo
INSERT INTO public.profiles (id, tenant_id, email, full_name, role, is_active)
VALUES (
  'uuid-do-usuario',           -- UUID do usuário criado no Auth
  'uuid-da-empresa',          -- UUID da empresa (tenant)
  'usuario@empresa.com',
  'Nome do Usuário',
  'user',  -- 'admin', 'user', 'manager'
  true
);
```

**Como descobrir o UUID da empresa:**
```sql
-- Listar todas as empresas
SELECT id, name, slug FROM public.tenants;

-- Ou buscar pelo slug
SELECT id, name FROM public.tenants WHERE slug = 'minha-empresa';
```

---

## 🔍 Verificar Empresas Cadastradas

### Via Supabase SQL Editor

```sql
-- Listar todas as empresas
SELECT 
  id,
  name,
  slug,
  email,
  is_active,
  created_at
FROM public.tenants
ORDER BY created_at DESC;
```

### Via Supabase Dashboard

1. Acesse: Supabase Dashboard → Table Editor
2. Selecione a tabela `tenants`
3. Veja todas as empresas cadastradas

---

## 📊 Verificar Usuários de uma Empresa

```sql
-- Ver todos os usuários de uma empresa específica
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  t.name as empresa_nome
FROM public.profiles p
JOIN public.tenants t ON t.id = p.tenant_id
WHERE t.slug = 'minha-empresa'  -- ou use t.id = 'uuid-da-empresa'
ORDER BY p.created_at;
```

---

## 🛠️ Gerenciar Empresas

### Desativar uma Empresa

```sql
-- Desativar empresa (usuários não poderão mais acessar)
UPDATE public.tenants
SET is_active = false
WHERE slug = 'empresa-slug';
```

### Ativar uma Empresa

```sql
-- Reativar empresa
UPDATE public.tenants
SET is_active = true
WHERE slug = 'empresa-slug';
```

### Editar Dados da Empresa

```sql
-- Atualizar dados da empresa
UPDATE public.tenants
SET 
  name = 'Novo Nome',
  email = 'novo@email.com',
  phone = '(11) 9999-9999'
WHERE slug = 'empresa-slug';
```

---

## 🎯 Fluxo Recomendado

### Para Cadastrar Nova Empresa:

1. **Use o Signup** (`/signup`)
   - Mais simples
   - Cria tudo automaticamente
   - Primeiro usuário já é admin

2. **Adicione mais usuários:**
   - Crie página de gerenciamento de usuários
   - Ou use Supabase Dashboard manualmente

### Para Múltiplas Empresas:

1. Cada empresa faz seu próprio signup
2. Cada empresa é isolada automaticamente (RLS)
3. Não há risco de ver dados de outras empresas

---

## ⚠️ Importante

### Slug deve ser único

O `slug` da empresa deve ser único. Se tentar criar com slug duplicado, receberá erro:

```
duplicate key value violates unique constraint "tenants_slug_key"
```

**Solução:** Use um slug diferente ou edite a empresa existente.

### UUIDs

- Cada empresa tem um UUID único (`id`)
- Cada usuário tem um UUID único (`id` no Auth)
- O profile liga os dois via `tenant_id`

### RLS Protege Automaticamente

- Usuários só veem dados do seu `tenant_id`
- Não é possível acessar dados de outras empresas
- Mesmo tentando via SQL direto, RLS bloqueia

---

## 📝 Exemplo Completo: Criar Empresa + 3 Usuários

```sql
-- 1. Criar empresa
INSERT INTO public.tenants (name, slug, email)
VALUES ('Minha Empresa', 'minha-empresa', 'contato@empresa.com')
RETURNING id;
-- Anote o id retornado: ex: '123e4567-e89b-12d3-a456-426614174000'

-- 2. Criar usuários no Supabase Auth (via Dashboard)
-- Usuário 1: admin@empresa.com → UUID: user-1-uuid
-- Usuário 2: vendedor@empresa.com → UUID: user-2-uuid  
-- Usuário 3: estoque@empresa.com → UUID: user-3-uuid

-- 3. Criar profiles
INSERT INTO public.profiles (id, tenant_id, email, full_name, role) VALUES
  ('user-1-uuid', '123e4567-e89b-12d3-a456-426614174000', 'admin@empresa.com', 'Admin', 'admin'),
  ('user-2-uuid', '123e4567-e89b-12d3-a456-426614174000', 'vendedor@empresa.com', 'Vendedor', 'user'),
  ('user-3-uuid', '123e4567-e89b-12d3-a456-426614174000', 'estoque@empresa.com', 'Estoque', 'user');
```

---

## 🚀 Próximos Passos

1. **Criar página de gerenciamento de usuários** (opcional)
2. **Criar página de configurações da empresa** (opcional)
3. **Adicionar validações** (ex: CNPJ único por empresa)

---

**Dúvidas?** Consulte o `README.md` ou os arquivos de código!

