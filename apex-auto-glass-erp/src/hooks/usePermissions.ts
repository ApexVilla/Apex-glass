/**
 * Hook para verificação de permissões
 * Facilita a verificação de permissões em componentes React
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { permissionService, userRoleService } from '@/services/rbacService';

/**
 * Hook para verificar se o usuário tem uma permissão específica
 */
export function usePermission(moduleSlug: string, action: string) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const has = await permissionService.hasPermission(
          user.id,
          moduleSlug,
          action as any
        );
        setHasPermission(has);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [user, moduleSlug, action]);

  return { hasPermission, loading };
}

/**
 * Hook para verificar se o usuário tem uma role específica
 */
export function useRole(roleSlug: string, companyId?: string) {
  const { user, company } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!user) {
        setHasRole(false);
        setLoading(false);
        return;
      }

      try {
        const has = await userRoleService.hasRole(
          user.id,
          roleSlug,
          companyId || company?.id
        );
        setHasRole(has);
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [user, roleSlug, companyId, company?.id]);

  return { hasRole, loading };
}

/**
 * Hook para verificar múltiplas permissões
 */
export function usePermissions(permissions: Array<{ module: string; action: string }>) {
  const { user } = useAuth();
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      if (!user) {
        setPermissionsMap({});
        setLoading(false);
        return;
      }

      const results: Record<string, boolean> = {};

      try {
        await Promise.all(
          permissions.map(async (perm) => {
            const key = `${perm.module}_${perm.action}`;
            const has = await permissionService.hasPermission(
              user.id,
              perm.module,
              perm.action as any
            );
            results[key] = has;
          })
        );

        setPermissionsMap(results);
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [user, JSON.stringify(permissions)]);

  return { permissionsMap, loading };
}

/**
 * Hook para verificar se o usuário é administrador
 */
export function useIsAdmin() {
  const { profile } = useAuth();
  return profile?.role === 'admin' || false;
}

