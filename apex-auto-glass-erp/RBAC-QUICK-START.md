# 🚀 Guia Rápido - Módulo RBAC

## ⚡ Início Rápido

### 1. Aplicar Migração

Execute a migração SQL no Supabase:

```bash
# Via Supabase CLI
supabase db push

# Ou via Dashboard
# 1. Acesse Supabase Dashboard
# 2. SQL Editor
# 3. Cole o conteúdo de: supabase/migrations/20251210000000_create_rbac_module.sql
# 4. Execute
```

### 2. Verificar Instalação

Após a migração, verifique:

- ✅ Tabelas criadas: `roles`, `modules`, `permissions`, `role_permissions`, `audit_logs`
- ✅ 10 módulos criados automaticamente
- ✅ 7 roles do sistema criadas
- ✅ Permissões configuradas para cada módulo

### 3. Usar no Código

#### Proteger Componente

```tsx
import { PermissionGuard } from '@/components/rbac/PermissionGuard';

<PermissionGuard module="customers" action="create">
  <Button>Criar Cliente</Button>
</PermissionGuard>
```

#### Verificar Permissão em Hook

```tsx
import { usePermission } from '@/hooks/usePermissions';

const { hasPermission } = usePermission('customers', 'create');
```

#### Atribuir Role a Usuário

```tsx
import { userRoleService } from '@/services/rbacService';

await userRoleService.assignRoleToUser(userId, roleId, companyId);
```

---

## 📋 Estrutura de Arquivos

```
src/
├── services/rbacService.ts          # Serviços principais
├── hooks/usePermissions.ts         # Hooks React
├── components/rbac/                # Componentes RBAC
│   ├── PermissionGuard.tsx
│   ├── RoleGuard.tsx
│   ├── UserStatsCards.tsx
│   ├── PermissionMatrix.tsx
│   ├── ResetPasswordModal.tsx
│   └── UserPermissionsModal.tsx
└── pages/
    ├── UsersRBAC.tsx               # Página de usuários
    └── Roles.tsx                   # Página de roles
```

---

## 🎯 Funcionalidades Principais

### ✅ Cadastro de Usuários
- Criar, editar, excluir usuários
- Atribuir roles
- Resetar senha
- Ativar/desativar usuários
- Bloqueio por tentativas de login

### ✅ Sistema de Roles
- Criar roles personalizadas
- Roles do sistema (não deletáveis)
- Matriz visual de permissões
- Atribuir múltiplas roles por usuário

### ✅ Permissões Granulares
- Por módulo e ação
- Ações: access, read, create, update, delete, export, approve
- Verificação automática via RPC

### ✅ Logs de Auditoria
- Todas as ações registradas
- Filtros por usuário, empresa, ação
- Histórico completo

---

## 🔧 Comandos Úteis

### Verificar Permissão

```typescript
const hasPermission = await permissionService.hasPermission(
  userId,
  'customers',  // módulo
  'create'       // ação
);
```

### Listar Roles de Usuário

```typescript
const roles = await userRoleService.getUserRoles(userId, companyId);
```

### Registrar Log

```typescript
await auditService.log('create', 'user', userId, { name: 'João' });
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- [RBAC-MODULE-DOCUMENTATION.md](./RBAC-MODULE-DOCUMENTATION.md)

---

## ⚠️ Importante

1. **Sempre use PermissionGuard** para proteger ações sensíveis
2. **Valide no backend** - nunca confie apenas na UI
3. **Revise logs** regularmente para segurança
4. **Teste permissões** após criar novas roles

---

**Pronto para usar!** 🎉

