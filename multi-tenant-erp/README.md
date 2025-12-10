# 🏢 Multi-Tenant ERP - Sistema Completo

Sistema ERP completo multi-tenant usando **Next.js 14**, **TypeScript**, **Supabase** e **Row Level Security (RLS)**.

## 📋 Características

- ✅ **Multi-Tenant Completo**: Isolamento total de dados por tenant
- ✅ **Row Level Security (RLS)**: Segurança no nível do banco de dados
- ✅ **Next.js 14**: App Router, Server Components, API Routes
- ✅ **TypeScript**: Tipagem completa
- ✅ **Supabase**: Autenticação, banco de dados e RLS
- ✅ **Pronto para Produção**: Deploy na Vercel

## 🏗️ Arquitetura

### Multi-Tenant

Cada empresa/cliente é um **tenant** isolado:

1. Tabela `tenants` armazena empresas
2. Tabela `profiles` liga `auth.uid()` → `tenant_id`
3. Todas as tabelas têm `tenant_id`
4. RLS garante que usuários só veem dados do seu tenant

### Fluxo de Autenticação

```
Signup → Cria Tenant → Cria Usuário Auth → Cria Profile (liga user → tenant)
Login → Busca Profile → Obtém tenant_id → RLS filtra dados automaticamente
```

## 🚀 Instalação

### 1. Pré-requisitos

- Node.js 18+ 
- Conta no Supabase (https://supabase.com)
- Git

### 2. Clone e Instale

```bash
cd multi-tenant-erp
npm install
```

### 3. Configure Supabase

#### 3.1. Criar Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Crie um novo projeto
3. Anote a **URL** e as **Keys**

#### 3.2. Executar Schema SQL

1. No Supabase Dashboard, vá em **SQL Editor**
2. Abra o arquivo `db/schema.sql`
3. Copie e cole todo o conteúdo
4. Execute (Run)

Isso criará:
- Todas as tabelas
- Índices
- Funções (get_user_tenant_id)
- Triggers (updated_at)
- **Todas as policies RLS**

#### 3.3. Executar Seeds (Opcional)

1. No SQL Editor, abra `db/seeds.sql`
2. Copie e cole
3. Execute

**IMPORTANTE**: Os UUIDs dos usuários no seeds.sql precisam corresponder aos usuários criados no Supabase Auth. Você precisará:

1. Criar os usuários manualmente no Supabase Auth
2. Atualizar os UUIDs no seeds.sql
3. Ou criar os usuários via signup e depois inserir os dados de teste

### 4. Configure Variáveis de Ambiente

Crie um arquivo `.env.local`:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Onde encontrar:**
- Supabase Dashboard → Seu Projeto → Settings → API
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA exponha no client!)

### 5. Execute o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## 📁 Estrutura do Projeto

```
multi-tenant-erp/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   └── auth/
│   │       ├── signup/       # Criar conta + tenant
│   │       └── logout/       # Logout
│   ├── dashboard/            # Dashboard principal
│   ├── login/                # Página de login
│   ├── signup/               # Página de cadastro
│   ├── produtos/             # CRUD de produtos
│   ├── vendas/               # CRUD de vendas
│   ├── fornecedores/         # CRUD de fornecedores
│   └── contas-receber/       # CRUD de contas a receber
├── components/               # Componentes React
│   └── LogoutButton.tsx
├── lib/                      # Bibliotecas e helpers
│   ├── supabaseClient.ts     # Client browser
│   ├── supabaseServer.ts     # Client server + service_role
│   └── withTenant.ts         # Middleware para obter tenant_id
├── types/                    # TypeScript types
│   └── database.ts           # Tipos do Supabase
├── db/                       # Scripts SQL
│   ├── schema.sql            # Schema completo + RLS
│   └── seeds.sql             # Dados de teste
├── scripts/                  # Scripts auxiliares
│   └── check_rls.sh          # Verificar RLS
└── README.md                 # Este arquivo
```

## 🔐 Row Level Security (RLS)

### Como Funciona

1. **Função `get_user_tenant_id()`**: Retorna o `tenant_id` do usuário logado
2. **Policies RLS**: Aplicadas automaticamente em todas as queries
3. **Isolamento Total**: Usuário nunca vê dados de outro tenant

### Exemplo de Policy

```sql
CREATE POLICY "Users can view products in their tenant"
  ON public.produtos FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());
```

Isso significa: usuários só podem ver produtos onde `tenant_id` = seu `tenant_id`.

### Testar RLS

Execute o script:

```bash
./scripts/check_rls.sh
```

Ou manualmente no Supabase SQL Editor:

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🧪 Testando o Sistema

### 1. Criar Primeira Conta

1. Acesse: http://localhost:3000/signup
2. Preencha:
   - Nome da Empresa: "Minha Empresa"
   - Slug: "minha-empresa"
   - Seu Nome: "João Silva"
   - Email: "joao@empresa.com"
   - Senha: "senha123"
3. Clique em "Criar conta"

Isso criará:
- ✅ Tenant "Minha Empresa"
- ✅ Usuário no Supabase Auth
- ✅ Profile ligando user → tenant

### 2. Fazer Login

1. Acesse: http://localhost:3000/login
2. Use o email e senha criados
3. Você será redirecionado para `/dashboard`

### 3. Testar Isolamento

1. Crie uma **segunda conta** com outra empresa
2. Faça login com cada conta
3. Verifique que cada uma só vê seus próprios dados

## 📊 Tabelas do Banco

### Core
- `tenants` - Empresas/Clientes
- `profiles` - Perfis de usuários (liga auth.uid() → tenant_id)

### Negócio
- `produtos` - Produtos/Estoque
- `fornecedores` - Fornecedores
- `vendas` - Vendas
- `venda_itens` - Itens de venda
- `contas_receber` - Contas a receber

Todas as tabelas têm:
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → tenants)
- `created_at`, `updated_at` (timestamps automáticos)

## 🚀 Deploy na Vercel

### 1. Preparação

1. Commit e push para GitHub
2. Certifique-se que `.env.local` não está no git (já está no `.gitignore`)

### 2. Deploy

1. Acesse: https://vercel.com
2. **New Project** → Importe seu repositório
3. Framework: **Next.js** (auto-detectado)
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
   NEXT_PUBLIC_SITE_URL=https://seu-projeto.vercel.app
   ```
5. **Deploy!**

### 3. Pós-Deploy

1. Teste login/signup
2. Verifique se RLS está funcionando
3. Teste criação de dados

## 🔧 Desenvolvimento

### Adicionar Nova Tabela

1. Adicione a tabela em `db/schema.sql`
2. Inclua `tenant_id UUID NOT NULL REFERENCES tenants(id)`
3. Crie policies RLS:
   ```sql
   CREATE POLICY "Users can view X in their tenant"
     ON public.nova_tabela FOR SELECT
     USING (tenant_id = public.get_user_tenant_id());
   ```
4. Atualize `types/database.ts`
5. Execute o SQL no Supabase

### Adicionar Nova Página

1. Crie em `app/nova-pagina/page.tsx`
2. Use `withTenant()` para obter `tenant_id`
3. Use `createClient()` do Supabase
4. RLS filtra automaticamente!

## 📝 Checklist de Deploy

### Antes do Deploy

- [ ] Schema SQL executado no Supabase
- [ ] RLS policies criadas e testadas
- [ ] Variáveis de ambiente configuradas
- [ ] Build local funciona (`npm run build`)
- [ ] Testes manuais realizados

### Durante Deploy

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy de preview testado
- [ ] Deploy de produção realizado

### Após Deploy

- [ ] Login/Signup funcionando
- [ ] RLS testado (usuários não veem dados de outros tenants)
- [ ] CRUD de todas as entidades testado
- [ ] Performance verificada

## 🐛 Troubleshooting

### Erro: "permission denied for table"

**Causa**: RLS não está habilitado ou policies não foram criadas.

**Solução**: Execute `db/schema.sql` novamente no Supabase.

### Erro: "new row violates row-level security policy"

**Causa**: Tentando inserir com `tenant_id` diferente do usuário logado.

**Solução**: Use `withTenant()` para obter o `tenant_id` correto.

### Erro: "relation does not exist"

**Causa**: Tabela não foi criada.

**Solução**: Execute `db/schema.sql` no Supabase.

### Usuário não vê dados

**Causa**: Profile não foi criado ou `tenant_id` está incorreto.

**Solução**: 
1. Verifique se profile existe: `SELECT * FROM profiles WHERE id = auth.uid()`
2. Verifique `tenant_id`: `SELECT tenant_id FROM profiles WHERE id = auth.uid()`

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

**Desenvolvido com ❤️ usando Next.js, TypeScript e Supabase**

