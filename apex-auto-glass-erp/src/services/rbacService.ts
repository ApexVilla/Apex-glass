/**
 * Serviço de gerenciamento de RBAC (Role-Based Access Control)
 * Gerencia usuários, roles, permissões e auditoria
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS
// =====================================================

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Module {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  route?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  module_id: string;
  name: string;
  slug: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve' | 'access';
  description?: string;
  created_at: string;
  module?: Module;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
  role?: Role;
  permission?: Permission;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  company_id: string;
  created_at: string;
  permission?: Permission;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id?: string;
  role?: string; // ENUM legacy
  company_id: string;
  created_at: string;
  role_data?: Role;
}

export interface AuditLog {
  id: string;
  company_id?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserWithRoles {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  last_access?: string;
  login_attempts?: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
  roles?: UserRole[];
}

// =====================================================
// SERVIÇO DE ROLES
// =====================================================

export const roleService = {
  /**
   * Lista todas as roles (globais e da empresa)
   */
  async listRoles(includeInactive = false): Promise<Role[]> {
    const query = supabase
      .from('roles')
      .select('*')
      .order('name');

    if (!includeInactive) {
      query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Busca uma role por ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Busca uma role por slug
   */
  async getRoleBySlug(slug: string): Promise<Role | null> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Cria uma nova role
   */
  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert(role)
      .select()
      .single();

    if (error) throw error;

    // Registrar log
    await auditService.log('create', 'role', data.id, { role_name: role.name });

    return data;
  },

  /**
   * Atualiza uma role
   */
  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Registrar log
    await auditService.log('update', 'role', id, updates);

    return data;
  },

  /**
   * Deleta uma role (apenas se não for do sistema)
   */
  async deleteRole(id: string): Promise<void> {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('is_system', false);

    if (error) throw error;

    // Registrar log
    await auditService.log('delete', 'role', id);
  },
};

// =====================================================
// SERVIÇO DE MÓDULOS
// =====================================================

export const moduleService = {
  /**
   * Lista todos os módulos ativos
   */
  async listModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) throw error;
    return data || [];
  },

  /**
   * Busca um módulo por slug
   */
  async getModuleBySlug(slug: string): Promise<Module | null> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

// =====================================================
// SERVIÇO DE PERMISSÕES
// =====================================================

export const permissionService = {
  /**
   * Lista todas as permissões
   */
  async listPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select(`
        *,
        module:modules(*)
      `)
      .order('module_id');

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista permissões por módulo
   */
  async listPermissionsByModule(moduleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('module_id', moduleId)
      .order('action');

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista permissões por módulo slug
   */
  async listPermissionsByModuleSlug(moduleSlug: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select(`
        *,
        module:modules!inner(*)
      `)
      .eq('module.slug', moduleSlug)
      .order('action');

    if (error) throw error;
    return data || [];
  },

  /**
   * Verifica se usuário tem permissão
   */
  async hasPermission(
    userId: string,
    moduleSlug: string,
    action: Permission['action']
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_module_slug: moduleSlug,
      p_action: action,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  },
};

// =====================================================
// SERVIÇO DE ROLE-PERMISSIONS
// =====================================================

export const rolePermissionService = {
  /**
   * Lista permissões de uma role
   */
  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        *,
        permission:permissions(
          *,
          module:modules(*)
        )
      `)
      .eq('role_id', roleId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Atualiza permissões de uma role
   */
  async updateRolePermissions(
    roleId: string,
    permissions: { permission_id: string; granted: boolean }[]
  ): Promise<void> {
    // Deletar permissões existentes
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Inserir novas permissões
    if (permissions.length > 0) {
      const { error } = await supabase
        .from('role_permissions')
        .insert(
          permissions.map((p) => ({
            role_id: roleId,
            permission_id: p.permission_id,
            granted: p.granted,
          }))
        );

      if (error) throw error;
    }

    // Registrar log
    await auditService.log('update', 'role_permissions', roleId, {
      permissions_count: permissions.length,
    });
  },
};

// =====================================================
// SERVIÇO DE USER-PERMISSIONS (OVERRIDES)
// =====================================================

export const userPermissionService = {
  /**
   * Lista permissões individuais de um usuário
   */
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        *,
        permission:permissions(
          *,
          module:modules(*)
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Define uma permissão individual (override)
   */
  async setUserPermission(
    userId: string,
    permissionId: string,
    granted: boolean,
    companyId: string
  ): Promise<UserPermission> {
    const { data, error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted: granted,
        company_id: companyId,
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar log
    await auditService.log('set_permission', 'user_permission', data.id, {
      user_id: userId,
      permission_id: permissionId,
      granted,
    });

    return data;
  },

  /**
   * Remove uma permissão individual (remove override)
   */
  async removeUserPermission(userId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId);

    if (error) throw error;

    // Registrar log
    await auditService.log('remove_permission', 'user_permission', null, {
      user_id: userId,
      permission_id: permissionId,
    });
  },
};

// =====================================================
// SERVIÇO DE USER-ROLES
// =====================================================

export const userRoleService = {
  /**
   * Lista roles de um usuário
   */
  async getUserRoles(userId: string, companyId?: string): Promise<UserRole[]> {
    let query = supabase
      .from('user_roles')
      .select(`
        *,
        role_data:roles(*)
      `)
      .eq('user_id', userId);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Atribui role a um usuário
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    companyId: string
  ): Promise<UserRole> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        company_id: companyId,
      })
      .select(`
        *,
        role_data:roles(*)
      `)
      .single();

    if (error) throw error;

    // Registrar log
    await auditService.log('assign_role', 'user_role', data.id, {
      user_id: userId,
      role_id: roleId,
    });

    return data;
  },

  /**
   * Remove role de um usuário
   */
  async removeRoleFromUser(userId: string, roleId: string, companyId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('company_id', companyId);

    if (error) throw error;

    // Registrar log
    await auditService.log('remove_role', 'user_role', null, {
      user_id: userId,
      role_id: roleId,
    });
  },

  /**
   * Verifica se usuário tem role
   */
  async hasRole(userId: string, roleSlug: string, companyId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_role', {
      p_user_id: userId,
      p_role_slug: roleSlug,
      p_company_id: companyId || null,
    });

    if (error) {
      console.error('Error checking role:', error);
      return false;
    }

    return data === true;
  },
};

// =====================================================
// SERVIÇO DE USUÁRIOS
// =====================================================

export const userService = {
  /**
   * Lista usuários com suas roles
   */
  async listUsers(companyId?: string): Promise<UserWithRoles[]> {
    const { data, error } = await supabase
      .rpc('get_users_with_roles', { p_company_id: companyId || null });

    if (error) throw error;
    
    // Transformar os dados para o formato esperado
    return (data || []).map((user: any) => ({
      ...user,
      roles: user.user_roles || []
    }));
  },

  /**
   * Busca usuário por ID com roles
   */
  async getUserById(userId: string): Promise<UserWithRoles | null> {
    // Buscar profile primeiro
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return null;

    // Buscar roles do usuário
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        *,
        role_data:roles(*)
      `)
      .eq('user_id', userId);

    if (rolesError) throw rolesError;

    return {
      ...profile,
      roles: userRoles || []
    };
  },

  /**
   * Atualiza status do usuário
   */
  async updateUserStatus(
    userId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        status,
        is_active: status === 'active',
      })
      .eq('id', userId);

    if (error) throw error;

    // Registrar log
    await auditService.log('update_status', 'user', userId, { status });
  },

  /**
   * Reseta senha do usuário (via Supabase Auth)
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    // Nota: Reset de senha deve ser feito via Admin API do Supabase
    // Por enquanto, retornamos erro informando que precisa ser feito via admin
    throw new Error(
      'Reset de senha deve ser feito via Admin API do Supabase. Use a função resetPasswordViaAdmin.'
    );
  },

  /**
   * Incrementa tentativas de login
   */
  async incrementLoginAttempts(userId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('login_attempts')
      .eq('id', userId)
      .single();

    const attempts = (profile?.login_attempts || 0) + 1;
    const maxAttempts = 5;
    const lockDuration = 30; // minutos

    const updates: any = {
      login_attempts: attempts,
    };

    // Bloquear após 5 tentativas
    if (attempts >= maxAttempts) {
      updates.locked_until = new Date(
        Date.now() + lockDuration * 60 * 1000
      ).toISOString();
      updates.status = 'suspended';
    }

    await supabase.from('profiles').update(updates).eq('id', userId);

    // Registrar log
    await auditService.log('login_attempt', 'user', userId, {
      attempts,
      locked: attempts >= maxAttempts,
    });
  },

  /**
   * Reseta tentativas de login (após login bem-sucedido)
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    await supabase
      .from('profiles')
      .update({
        login_attempts: 0,
        locked_until: null,
        last_access: new Date().toISOString(),
      })
      .eq('id', userId);
  },
};

// =====================================================
// SERVIÇO DE AUDITORIA
// =====================================================

export const auditService = {
  /**
   * Registra um log de auditoria
   */
  async log(
    action: string,
    entityType: string,
    entityId?: string | null,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_audit', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_details: details || null,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
      });

      if (error) {
        console.error('Error logging audit:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error logging audit:', error);
      return null;
    }
  },

  /**
   * Lista logs de auditoria
   */
  async listLogs(
    filters?: {
      companyId?: string;
      userId?: string;
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
    limit = 100
  ): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Lista logs de um usuário específico
   */
  async getUserLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.listLogs({ userId }, limit);
  },
};

