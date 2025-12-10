# 🔄 Fluxo Completo do Sistema

## 📋 Resumo do Fluxo

1. **Criar Empresa** (Multi-tenant `/signup`)
2. **Login** (Sistema Principal - Email + Senha + Nome da Empresa)
3. **Criar Usuários** (Admin cria usuários dentro da empresa)

---

## 1️⃣ CRIAR EMPRESA (Multi-tenant)

### Onde: `/signup` (multi-tenant-erp)

**URL:** `http://localhost:3000/signup` (ou URL de produção)

### Passo a Passo:

1. Acesse a página de Signup
2. Preencha o formulário:
   - **Nome da Empresa**: Ex: "Apex Villa"
   - **Slug**: Ex: "apex-villa" (gerado automaticamente)
   - **Seu Nome**: Ex: "João Silva"
   - **Email**: Ex: "joao@apexvilla.com" ⭐ **Este será o ADMIN**
   - **Senha**: Mínimo 6 caracteres

3. Clique em "Criar conta"

### ✨ O que acontece automaticamente:

✅ **Empresa criada** na tabela `companies`  
✅ **Usuário criado** no Supabase Auth  
✅ **Profile criado** ligando usuário → empresa  
✅ **Usuário vira ADMIN** automaticamente (role: 'admin')  
✅ **Role criada** na tabela `user_roles`

### 🎯 Resultado:

- Email usado vira **ADMIN da empresa**
- Pode fazer login imediatamente
- Empresa está isolada (só usuários da empresa veem os dados)

---

## 2️⃣ LOGIN (Sistema Principal)

### Onde: Página de Login do sistema principal

**URL:** `http://localhost:8081` (ou IP do servidor)

### Passo a Passo:

1. Acesse a página de login
2. Preencha:
   - **Email**: O email usado no signup (ex: "joao@apexvilla.com")
   - **Senha**: A senha criada no signup
   - **Empresa (Chave)**: Nome da empresa (ex: "Apex Villa") ⭐ **Nome exato ou parcial**

3. Clique em "Entrar"

### 🔍 Como funciona:

- Sistema busca empresa pelo **nome** (busca exata ou parcial)
- Valida se o usuário pertence à empresa
- Se for admin/master, pode acessar qualquer empresa
- Se for usuário normal, só acessa sua empresa

### ⚠️ Importante:

- **Chave = Nome da Empresa** (não slug)
- Pode deixar em branco para usar empresa padrão do usuário
- Busca é case-insensitive (não diferencia maiúsculas/minúsculas)

---

## 3️⃣ CRIAR USUÁRIOS (Dentro da Empresa)

### Onde: Página `/users` (após login como admin)

### Passo a Passo:

1. Faça login como **ADMIN** da empresa
2. Acesse a página **Usuários** no menu
3. Clique em **"Novo Usuário"**
4. Preencha:
   - **Nome Completo**: Ex: "Maria Santos"
   - **Email**: Ex: "maria@apexvilla.com"
   - **Senha**: Mínimo 6 caracteres
   - **Telefone**: (opcional)
   - **Role**: Escolha (seller, manager, installer, etc.)
   - **Empresa**: Já vem selecionada (sua empresa)

5. Clique em **"Salvar"**

### ✨ O que acontece:

✅ **Usuário criado** no Supabase Auth  
✅ **Profile criado** ligando usuário → **sua empresa**  
✅ **Role criada** na tabela `user_roles`  
✅ Usuário pode fazer login imediatamente

### 🎯 Resultado:

- Novo usuário pertence à **mesma empresa** do admin
- Pode fazer login com: Email + Senha + Nome da Empresa
- Acesso limitado pela **role** atribuída

---

## 📊 Estrutura de Dados

```
┌─────────────────────────────────────────┐
│  companies (Empresas)                   │
│  - id                                   │
│  - name (Nome da Empresa)               │
│  - email                                │
└─────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────────────┐
│  profiles (Usuários)                    │
│  - id (UUID do auth.users)              │
│  - company_id → companies.id             │
│  - email                                 │
│  - full_name                             │
│  - role (admin, manager, seller, etc.)  │
└─────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────────────┐
│  user_roles (Roles dos Usuários)        │
│  - user_id → profiles.id                 │
│  - company_id → companies.id             │
│  - role                                  │
└─────────────────────────────────────────┘
```

---

## 🔐 Segurança

- ✅ **RLS (Row Level Security)** protege todos os dados
- ✅ Usuários só veem dados da **sua empresa**
- ✅ Admin pode criar usuários **apenas na sua empresa**
- ✅ Cada empresa é **completamente isolada**

---

## 📝 Resumo Visual

```
┌─────────────────────────────────────────┐
│  1. SIGNUP (/signup)                   │
│     • Nome da Empresa                   │
│     • Seu Nome                          │
│     • Email (vira ADMIN)                │
│     • Senha                             │
│                                         │
│     ✅ Empresa + Admin criados          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  2. LOGIN (Sistema Principal)           │
│     • Email                             │
│     • Senha                             │
│     • Nome da Empresa (chave)           │
│                                         │
│     ✅ Acesso ao sistema                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  3. CRIAR USUÁRIOS (/users)            │
│     • Nome                              │
│     • Email                             │
│     • Senha                             │
│     • Role                              │
│                                         │
│     ✅ Usuário criado na empresa        │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] Empresa criada via `/signup`
- [ ] Admin pode fazer login
- [ ] Admin acessa página de Usuários
- [ ] Admin cria novos usuários
- [ ] Novos usuários fazem login
- [ ] Todos veem apenas dados da empresa

---

**🎉 Pronto! Sistema multi-tenant funcionando!**

