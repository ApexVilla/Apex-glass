/**
 * Componente para proteger rotas/componentes baseado em roles
 */

import { ReactNode } from 'react';
import { useRole } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLoader?: boolean;
}

export function RoleGuard({
  role,
  children,
  fallback = null,
  showLoader = true,
}: RoleGuardProps) {
  const { hasRole, loading } = useRole(role);

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

