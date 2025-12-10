# ✅ Schema Criado com Sucesso! Próximos Passos

## 🎉 Parabéns!

O banco de dados foi criado com sucesso! Agora siga estes passos:

## 📋 Checklist de Próximos Passos

### 1️⃣ Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais do Supabase:

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
nano .env.local
```

Preencha com seus valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Onde obter:**
- Supabase Dashboard → Seu Projeto → Settings → API

### 2️⃣ (Opcional) Executar Seeds

Se quiser dados de teste:

1. No Supabase SQL Editor
2. Abra: `db/seeds.sql`
3. Copie e execute

**Nota:** Os seeds criam tenants e produtos, mas os usuários precisam ser criados manualmente no Supabase Auth primeiro.

### 3️⃣ Iniciar o Servidor

```bash
cd /home/samir/Documentos/apex-glass1.2/multi-tenant-erp
npm run dev
```

Você verá:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
```

### 4️⃣ Acessar o Sistema

Abra no navegador:
- **http://localhost:3000**
- Ou diretamente: **http://localhost:3000/signup**

### 5️⃣ Criar Primeira Empresa

1. Acesse `/signup`
2. Preencha:
   - Nome da Empresa
   - Seu Nome
   - Email
   - Senha
3. Clique em "Criar conta"

Isso criará:
- ✅ Empresa (tenant)
- ✅ Usuário no Supabase Auth
- ✅ Profile ligando usuário → empresa
- ✅ Você vira admin automaticamente

### 6️⃣ Fazer Login

1. Acesse `/login`
2. Use o email e senha criados
3. Você será redirecionado para `/dashboard`

## ✅ Verificações Finais

### Verificar se Tabelas Foram Criadas

Execute no Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'profiles', 'produtos', 'fornecedores', 'vendas', 'venda_itens', 'contas_receber')
ORDER BY table_name;
```

Deve retornar **7 tabelas**.

### Verificar RLS

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'profiles', 'produtos', 'fornecedores', 'vendas', 'venda_itens', 'contas_receber');
```

Todas devem ter `rowsecurity = true`.

### Verificar Policies

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Deve mostrar várias policies para cada tabela.

## 🎯 Testar o Sistema

1. **Criar uma empresa** via signup
2. **Fazer login**
3. **Criar um produto**
4. **Criar uma venda**
5. **Verificar isolamento:** Criar segunda empresa e verificar que não vê dados da primeira

## 🚀 Pronto para Produção?

Depois de testar localmente:

1. Configure variáveis na Vercel
2. Faça deploy
3. Teste em produção

Veja `CHECKLIST-DEPLOY.md` para detalhes.

---

**🎉 Tudo pronto! Agora é só configurar o .env.local e iniciar o servidor!**

