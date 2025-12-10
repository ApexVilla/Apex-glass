# 🏢 COMO CADASTRAR UMA EMPRESA - RESUMO RÁPIDO

## ✅ FORMA MAIS SIMPLES (Recomendada)

### 📍 Onde: Página de Signup

**URL:** `http://localhost:3000/signup` (ou sua URL de produção)

### 📝 Passo a Passo:

1. **Acesse a página de Signup**
   ```
   http://localhost:3000/signup
   ```

2. **Preencha o formulário:**
   - **Nome da Empresa**: Ex: "Minha Empresa Ltda"
   - **Slug**: Ex: "minha-empresa" (gerado automaticamente)
   - **Seu Nome**: Ex: "João Silva"
   - **Email**: Ex: "joao@empresa.com"
   - **Senha**: Mínimo 6 caracteres

3. **Clique em "Criar conta"**

### ✨ O que acontece automaticamente:

✅ **Empresa criada** na tabela `tenants`  
✅ **Usuário criado** no Supabase Auth  
✅ **Profile criado** ligando usuário → empresa  
✅ **Usuário vira admin** automaticamente  

### 🎯 Resultado:

- Você pode fazer login imediatamente
- A empresa está isolada (só você vê os dados dela)
- Você é o administrador da empresa

---

## 🔄 Adicionar Mais Usuários à Empresa

### Opção 1: Via Supabase Dashboard (Mais Rápido)

1. **Criar usuário no Auth:**
   - Supabase Dashboard → Authentication → Users → **Add User**
   - Preencha email e senha
   - **Anote o UUID** do usuário criado

2. **Criar profile no SQL Editor:**
   ```sql
   -- Substitua os valores
   INSERT INTO public.profiles (id, tenant_id, email, full_name, role)
   VALUES (
     'uuid-do-usuario',        -- UUID do passo 1
     'uuid-da-sua-empresa',    -- UUID da sua empresa
     'usuario@empresa.com',
     'Nome do Usuário',
     'user'  -- ou 'admin', 'manager'
   );
   ```

3. **Como descobrir o UUID da sua empresa:**
   ```sql
   -- Execute no SQL Editor
   SELECT id, name, slug FROM public.tenants WHERE slug = 'seu-slug';
   ```

### Opção 2: Criar Página de Gerenciamento (Futuro)

Você pode criar uma página `/dashboard/usuarios` para adicionar usuários pela interface.

---

## 📊 Ver Empresas Cadastradas

### Via Supabase Dashboard:

1. Acesse: **Supabase Dashboard → Table Editor**
2. Selecione a tabela **`tenants`**
3. Veja todas as empresas

### Via SQL:

```sql
SELECT id, name, slug, email, is_active, created_at
FROM public.tenants
ORDER BY created_at DESC;
```

---

## 🎯 Resumo Visual

```
┌─────────────────────────────────────────┐
│  1. ACESSE /signup                      │
│                                         │
│  2. PREENCHA:                           │
│     • Nome da Empresa                   │
│     • Seu Nome                          │
│     • Email                             │
│     • Senha                             │
│                                         │
│  3. CLIQUE EM "Criar conta"            │
│                                         │
│  ✅ EMPRESA CRIADA AUTOMATICAMENTE!    │
└─────────────────────────────────────────┘
```

---

## ⚠️ Importante

- **Cada empresa é isolada**: Usuários de uma empresa não veem dados de outra
- **Slug deve ser único**: Se o slug já existe, escolha outro
- **Primeiro usuário é admin**: Automaticamente recebe role 'admin'
- **RLS protege tudo**: Mesmo tentando acessar via SQL, RLS bloqueia

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- **`GUIA-CADASTRO-EMPRESAS.md`** - Guia completo e detalhado
- **`README.md`** - Documentação geral do projeto

---

**🎉 Pronto! Agora você sabe como cadastrar empresas!**

