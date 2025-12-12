# 📚 Documentação Completa - Módulo RBAC (Usuários e Permissões)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Módulo](#estrutura-do-módulo)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Arquitetura do Sistema](#arquitetura-do-sistema)
5. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
6. [Políticas RLS (Row Level Security)](#políticas-rls)
7. [Serviços e APIs](#serviços-e-apis)
8. [Componentes Frontend](#componentes-frontend)
9. [Hooks e Utilities](#hooks-e-utilities)
10. [Guia de Uso](#guia-de-uso)
11. [Segurança](#segurança)
12. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Visão Geral

O módulo RBAC (Role-Based Access Control) é um sistema completo de gerenciamento de usuários e permissões para o ERP Apex Glass. Ele fornece:

- ✅ Cadastro completo de usuários
- ✅ Sistema de roles (perfis de acesso)
- ✅ Permissões granulares por módulo
- ✅ Matriz visual de permissões
- ✅ Logs de auditoria
- ✅ Controle de acesso baseado em permissões
- ✅ Integração total com Supabase

---

## 📁 Estrutura do Módulo

```
apex-auto-glass-erp/
├── supabase/
│   └── migrations/
│       └── 20251210000000_create_rbac_module.sql  # Migração principal
├── src/
│   ├── services/
│   │   └── rbacService.ts                          # Serviços RBAC
│   ├── hooks/
│   │   └── usePermissions.ts                       # Hooks de permissões
│   ├── components/
│   │   └── rbac/
│   │       ├── PermissionGuard.tsx                 # Guard de permissões
│   │       ├── RoleGuard.tsx                       # Guard de roles
│   │       ├── UserStatsCards.tsx                  # Cards de estatísticas
│   │       ├── PermissionMatrix.tsx                # Matriz de permissões
│   │       ├── ResetPasswordModal.tsx               # Modal reset senha
│   │       └── UserPermissionsModal.tsx             # Modal permissões usuário
│   └── pages/
│       ├── UsersRBAC.tsx                           # Página de usuários (RBAC)
│       └── Roles.tsx                               # Página de roles
└── RBAC-MODULE-DOCUMENTATION.md                    # Esta documentação
```

---

## 🚀 Instalação e Configuração

### 1. Aplicar Migração SQL

Execute a migração no Supabase:

```sql
-- Execute o arquivo:
supabase/migrations/20251210000000_create_rbac_module.sql
```

Ou via Supabase Dashboard:
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo da migração
4. Execute

### 2. Verificar Tabelas Criadas

Após a migração, verifique se as seguintes tabelas foram criadas:

- ✅ `roles`
- ✅ `modules`
- ✅ `permissions`
- ✅ `role_permissions`
- ✅ `audit_logs`

### 3. Verificar Dados Iniciais

A migração cria automaticamente:

- **10 Módulos** do sistema (Dashboard, Clientes, Produtos, etc.)
- **Permissões** para cada módulo (access, read, create, update, delete, export, approve)
- **7 Roles do sistema** (Administrador, Financeiro, Estoque, Vendas, Suporte, Gestor, Usuário Básico)

---

## 🏗️ Arquitetura do Sistema

### Fluxo de Permissões

```
Usuário → User Roles → Role Permissions → Permissions → Modules
```

1. **Usuário** tem uma ou mais **Roles**
2. **Roles** têm **Permissões** associadas
3. **Permissões** estão vinculadas a **Módulos** e **Ações**

### Tipos de Ações

- `access` - Acesso ao módulo
- `read` - Visualizar dados
- `create` - Criar registros
- `update` - Editar registros
- `delete` - Excluir registros
- `export` - Exportar dados
- `approve` - Aprovar operações

---

## 🗄️ Tabelas do Banco de Dados

### 1. `roles`

Armazena os perfis de acesso (roles) do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `name` | TEXT | Nome da role |
| `slug` | TEXT | Identificador único (ex: `administrador`) |
| `description` | TEXT | Descrição da role |
| `is_system` | BOOLEAN | Se é role do sistema (não pode ser deletada) |
| `is_active` | BOOLEAN | Se está ativa |
| `company_id` | UUID | ID da empresa (NULL = role global) |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### 2. `modules`

Armazena os módulos do sistema ERP.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `name` | TEXT | Nome do módulo |
| `slug` | TEXT | Identificador único |
| `description` | TEXT | Descrição |
| `icon` | TEXT | Nome do ícone (lucide-react) |
| `route` | TEXT | Rota do módulo |
| `order_index` | INTEGER | Ordem de exibição |
| `is_active` | BOOLEAN | Se está ativo |

### 3. `permissions`

Armazena as permissões granulares.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `module_id` | UUID | ID do módulo |
| `name` | TEXT | Nome da permissão |
| `slug` | TEXT | Identificador único |
| `action` | ENUM | Ação (create, read, update, delete, export, approve, access) |
| `description` | TEXT | Descrição |

### 4. `role_permissions`

Relação entre roles e permissões.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `role_id` | UUID | ID da role |
| `permission_id` | UUID | ID da permissão |
| `granted` | BOOLEAN | Se a permissão está concedida |

### 5. `audit_logs`

Logs de auditoria de todas as ações.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `company_id` | UUID | ID da empresa |
| `user_id` | UUID | ID do usuário |
| `action` | TEXT | Ação realizada |
| `entity_type` | TEXT | Tipo de entidade |
| `entity_id` | UUID | ID da entidade |
| `details` | JSONB | Detalhes adicionais |
| `ip_address` | INET | IP do usuário |
| `user_agent` | TEXT | User agent |
| `created_at` | TIMESTAMPTZ | Data/hora |

---

## 🔒 Políticas RLS

### Regras Gerais

1. **Administradores** têm acesso total
2. **Usuários** só veem dados da sua empresa
3. **Logs de auditoria** são apenas leitura (exceto inserção via função)

### Policies Implementadas

#### Roles
- ✅ SELECT: Usuários veem roles da empresa ou globais
- ✅ INSERT/UPDATE/DELETE: Apenas administradores

#### Modules
- ✅ SELECT: Todos os usuários autenticados veem módulos ativos
- ✅ INSERT/UPDATE/DELETE: Apenas administradores

#### Permissions
- ✅ SELECT: Todos os usuários autenticados
- ✅ INSERT/UPDATE/DELETE: Apenas administradores

#### Role Permissions
- ✅ SELECT: Usuários veem permissões de roles acessíveis
- ✅ INSERT/UPDATE/DELETE: Apenas administradores

#### Audit Logs
- ✅ SELECT: Usuários veem logs da empresa
- ✅ INSERT: Sistema (via função)
- ✅ UPDATE/DELETE: Bloqueado

---

## 🔧 Serviços e APIs

### `rbacService.ts`

#### `roleService`

```typescript
// Listar roles
const roles = await roleService.listRoles();

// Buscar role por ID
const role = await roleService.getRoleById(roleId);

// Criar role
const newRole = await roleService.createRole({
  name: 'Vendedor Senior',
  slug: 'vendedor_senior',
  description: 'Vendedor com permissões avançadas',
  is_system: false,
  is_active: true,
});

// Atualizar role
await roleService.updateRole(roleId, { is_active: false });

// Deletar role
await roleService.deleteRole(roleId);
```

#### `permissionService`

```typescript
// Verificar permissão
const hasPermission = await permissionService.hasPermission(
  userId,
  'customers',
  'create'
);

// Listar permissões
const permissions = await permissionService.listPermissions();

// Listar permissões por módulo
const modulePermissions = await permissionService.listPermissionsByModule(moduleId);
```

#### `userRoleService`

```typescript
// Atribuir role a usuário
await userRoleService.assignRoleToUser(userId, roleId, companyId);

// Remover role de usuário
await userRoleService.removeRoleFromUser(userId, roleId, companyId);

// Verificar se usuário tem role
const hasRole = await userRoleService.hasRole(userId, 'administrador');
```

#### `userService`

```typescript
// Listar usuários
const users = await userService.listUsers(companyId);

// Buscar usuário
const user = await userService.getUserById(userId);

// Atualizar status
await userService.updateUserStatus(userId, 'suspended');
```

#### `auditService`

```typescript
// Registrar log
await auditService.log('create', 'user', userId, { name: 'João' });

// Listar logs
const logs = await auditService.listLogs({
  companyId: '...',
  userId: '...',
  action: 'create',
});
```

---

## 🎨 Componentes Frontend

### `PermissionGuard`

Protege componentes baseado em permissões:

```tsx
<PermissionGuard module="customers" action="create">
  <Button>Criar Cliente</Button>
</PermissionGuard>
```

### `RoleGuard`

Protege componentes baseado em roles:

```tsx
<RoleGuard role="administrador">
  <AdminPanel />
</RoleGuard>
```

### `UserStatsCards`

Exibe estatísticas de usuários:

```tsx
<UserStatsCards />
```

### `PermissionMatrix`

Matriz visual de permissões por role:

```tsx
<PermissionMatrix roleId={roleId} onUpdate={handleUpdate} />
```

### `ResetPasswordModal`

Modal para resetar senha:

```tsx
<ResetPasswordModal
  open={isOpen}
  onOpenChange={setIsOpen}
  userId={userId}
  userName="João Silva"
/>
```

---

## 🪝 Hooks e Utilities

### `usePermission`

Verifica se usuário tem permissão:

```tsx
const { hasPermission, loading } = usePermission('customers', 'create');

if (hasPermission) {
  // Mostrar botão criar
}
```

### `useRole`

Verifica se usuário tem role:

```tsx
const { hasRole, loading } = useRole('administrador');

if (hasRole) {
  // Mostrar painel admin
}
```

### `usePermissions`

Verifica múltiplas permissões:

```tsx
const { permissionsMap, loading } = usePermissions([
  { module: 'customers', action: 'create' },
  { module: 'customers', action: 'update' },
]);
```

### `useIsAdmin`

Verifica se é administrador:

```tsx
const isAdmin = useIsAdmin();
```

---

## 📖 Guia de Uso

### 1. Criar uma Nova Role

1. Acesse a página **Roles** (`/roles`)
2. Clique em **Nova Role**
3. Preencha:
   - Nome: `Vendedor Senior`
   - Slug: `vendedor_senior` (gerado automaticamente)
   - Descrição: `Vendedor com permissões avançadas`
4. Clique em **Salvar**
5. Clique no ícone de **Configurações** para gerenciar permissões
6. Marque as permissões desejadas na matriz
7. Clique em **Salvar Permissões**

### 2. Atribuir Role a um Usuário

1. Acesse a página **Usuários** (`/users`)
2. Clique no ícone **UserCog** ao lado do usuário
3. Selecione a role desejada
4. Clique em **Atribuir Role**

### 3. Verificar Permissões em um Componente

```tsx
import { PermissionGuard } from '@/components/rbac/PermissionGuard';

function CustomersPage() {
  return (
    <div>
      <h1>Clientes</h1>
      
      <PermissionGuard module="customers" action="create">
        <Button>Criar Cliente</Button>
      </PermissionGuard>
      
      <PermissionGuard module="customers" action="update">
        <Button>Editar</Button>
      </PermissionGuard>
    </div>
  );
}
```

### 4. Verificar Permissões em uma Rota

```tsx
import { usePermission } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

function ProtectedRoute() {
  const { hasPermission, loading } = usePermission('customers', 'access');
  
  if (loading) return <Loader />;
  if (!hasPermission) return <Navigate to="/unauthorized" />;
  
  return <CustomersPage />;
}
```

---

## 🔐 Segurança

### Implementações de Segurança

1. **Row Level Security (RLS)**
   - Todas as tabelas têm RLS habilitado
   - Usuários só veem dados da sua empresa
   - Administradores têm acesso total

2. **Hash de Senhas**
   - Senhas são armazenadas com hash pelo Supabase Auth
   - Nunca são expostas em logs ou respostas

3. **JWT com Expiração**
   - Tokens JWT expiram automaticamente
   - Refresh tokens são gerenciados pelo Supabase

4. **Bloqueio por Tentativas**
   - Após 5 tentativas de login falhadas, usuário é bloqueado por 30 minutos
   - Campo `locked_until` controla o bloqueio

5. **Logs de Auditoria**
   - Todas as ações importantes são registradas
   - Inclui IP, user agent e detalhes da ação

6. **Verificação de Permissões**
   - Todas as operações verificam permissões
   - Funções RPC garantem segurança no backend

### Boas Práticas

- ✅ Sempre use `PermissionGuard` ou `usePermission` antes de ações sensíveis
- ✅ Nunca confie apenas na UI - sempre valide no backend
- ✅ Use `auditService.log()` para registrar ações importantes
- ✅ Mantenha roles e permissões organizadas
- ✅ Revise logs de auditoria regularmente

---

## ✅ Checklist de Implementação

### Fase 1: Banco de Dados
- [x] Executar migração SQL
- [x] Verificar criação de tabelas
- [x] Verificar dados iniciais (módulos, roles, permissões)
- [x] Testar policies RLS
- [x] Verificar funções RPC

### Fase 2: Backend/Serviços
- [x] Implementar `rbacService.ts`
- [x] Testar todos os serviços
- [x] Implementar `auditService`
- [x] Criar funções auxiliares

### Fase 3: Frontend - Hooks e Guards
- [x] Implementar `usePermission`
- [x] Implementar `useRole`
- [x] Implementar `usePermissions`
- [x] Criar `PermissionGuard`
- [x] Criar `RoleGuard`

### Fase 4: Frontend - Componentes
- [x] Criar `UserStatsCards`
- [x] Criar `PermissionMatrix`
- [x] Criar `ResetPasswordModal`
- [x] Criar `UserPermissionsModal`

### Fase 5: Frontend - Páginas
- [x] Criar página `Roles.tsx`
- [x] Criar página `UsersRBAC.tsx`
- [x] Integrar componentes
- [x] Adicionar rotas no router

### Fase 6: Testes
- [ ] Testar criação de usuário
- [ ] Testar atribuição de roles
- [ ] Testar permissões
- [ ] Testar logs de auditoria
- [ ] Testar bloqueio por tentativas
- [ ] Testar reset de senha

### Fase 7: Documentação
- [x] Criar documentação completa
- [ ] Criar guia de migração
- [ ] Criar exemplos de uso
- [ ] Documentar APIs

---

## 🐛 Troubleshooting

### Problema: Permissões não funcionam

**Solução:**
1. Verifique se o usuário tem role atribuída
2. Verifique se a role tem permissões configuradas
3. Verifique se a função `has_permission` está funcionando
4. Verifique logs do Supabase

### Problema: RLS bloqueando acesso

**Solução:**
1. Verifique se o usuário está autenticado
2. Verifique se o `company_id` está correto
3. Verifique as policies RLS
4. Teste com usuário admin

### Problema: Roles não aparecem

**Solução:**
1. Verifique se `is_active = true`
2. Verifique se `company_id` está correto
3. Verifique permissões de leitura

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte esta documentação
2. Verifique os logs do Supabase
3. Revise as policies RLS
4. Teste com usuário administrador

---

## 📝 Changelog

### v1.0.0 (2024-12-10)
- ✅ Criação inicial do módulo RBAC
- ✅ Migração SQL completa
- ✅ Serviços e hooks
- ✅ Componentes frontend
- ✅ Documentação completa

---

**Desenvolvido para Apex Glass ERP** 🚀

