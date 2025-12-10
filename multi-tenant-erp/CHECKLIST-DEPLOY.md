# ✅ Checklist de Deploy - Multi-Tenant ERP

Use este checklist para garantir que tudo está pronto antes do deploy.

## 📋 Pré-Deploy

### Configuração do Supabase

- [ ] Projeto criado no Supabase
- [ ] Schema SQL executado (`db/schema.sql`)
- [ ] Seeds executados (opcional, `db/seeds.sql`)
- [ ] RLS verificado (execute `./scripts/check_rls.sh`)
- [ ] Função `get_user_tenant_id()` testada
- [ ] Policies RLS testadas manualmente

### Configuração Local

- [ ] `.env.local` criado e preenchido
- [ ] `npm install` executado
- [ ] `npm run dev` funciona localmente
- [ ] Login/Signup testado localmente
- [ ] CRUD de produtos testado
- [ ] CRUD de vendas testado
- [ ] Isolamento multi-tenant testado (2 tenants diferentes)

### Build

- [ ] `npm run build` executa sem erros
- [ ] `npm run start` funciona
- [ ] Sem warnings críticos no build
- [ ] TypeScript compila sem erros (`npm run type-check`)

### Código

- [ ] Todas as variáveis de ambiente documentadas
- [ ] `.env.local` no `.gitignore`
- [ ] Código commitado no Git
- [ ] Repositório no GitHub/GitLab

## 🚀 Deploy na Vercel

### Configuração do Projeto

- [ ] Conta Vercel criada
- [ ] Projeto importado do GitHub
- [ ] Framework detectado: Next.js
- [ ] Build Command: `npm run build` (padrão)
- [ ] Output Directory: `.next` (padrão)

### Variáveis de Ambiente

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] `NEXT_PUBLIC_SITE_URL` configurada (URL da Vercel)
- [ ] Todas marcadas para Production, Preview e Development

### Deploy

- [ ] Deploy de Preview realizado
- [ ] Preview testado (login, signup, CRUD)
- [ ] Deploy de Production realizado
- [ ] Production testado

## 🧪 Testes Pós-Deploy

### Autenticação

- [ ] Signup funciona
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Sessão persiste entre reloads
- [ ] Redirecionamento funciona (não logado → login)

### Funcionalidades

- [ ] Dashboard carrega
- [ ] Listagem de produtos funciona
- [ ] Criação de produto funciona
- [ ] Listagem de vendas funciona
- [ ] Criação de venda funciona
- [ ] Listagem de fornecedores funciona
- [ ] Listagem de contas a receber funciona

### Multi-Tenant

- [ ] Criar 2 tenants diferentes
- [ ] Fazer login com cada tenant
- [ ] Verificar que cada um só vê seus dados
- [ ] Tentar acessar dados de outro tenant (deve falhar)

### Performance

- [ ] Páginas carregam rapidamente
- [ ] Sem erros no console do navegador
- [ ] Sem erros nos logs da Vercel
- [ ] Sem erros nos logs do Supabase

## 🔒 Segurança

- [ ] RLS habilitado em todas as tabelas
- [ ] Policies RLS criadas para todas as operações
- [ ] Service Role Key não exposta no client
- [ ] Anon Key é pública (OK, protegida por RLS)
- [ ] Senhas não aparecem em logs

## 📊 Monitoramento

- [ ] Vercel Analytics configurado (opcional)
- [ ] Supabase Dashboard monitorado
- [ ] Logs verificados regularmente
- [ ] Erros reportados (Sentry, opcional)

## ✅ Finalização

- [ ] Domínio customizado configurado (opcional)
- [ ] SSL/HTTPS funcionando
- [ ] Backup do banco configurado (Supabase)
- [ ] Documentação atualizada
- [ ] Equipe treinada (se aplicável)

---

## 🆘 Em Caso de Problemas

### Build Falha

1. Verifique logs da Vercel
2. Teste build local: `npm run build`
3. Verifique variáveis de ambiente

### RLS Não Funciona

1. Execute `db/schema.sql` novamente
2. Verifique policies: `SELECT * FROM pg_policies`
3. Teste função: `SELECT get_user_tenant_id()`

### Erros 500

1. Verifique logs do Supabase
2. Verifique logs da Vercel
3. Teste queries manualmente no Supabase

---

**✅ Checklist completo? Você está pronto para produção!**

