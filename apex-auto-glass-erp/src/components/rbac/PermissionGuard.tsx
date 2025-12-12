import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { checkPermission, loading } = useAuth();

  if (loading) {
    // Opcional: mostrar loading ou nada enquanto carrega
    return null;
  }

  const hasAccess = checkPermission(module, action);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
