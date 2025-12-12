/**
 * Componente de cards de estatísticas de usuários
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
}

export function UserStatsCards() {
  const { company } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    byRole: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [company?.id]);

  const loadStats = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar todos os usuários da empresa
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, is_active, status, role')
        .eq('company_id', company.id);

      if (error) throw error;

      const statsData: UserStats = {
        total: users?.length || 0,
        active: users?.filter((u) => u.is_active && u.status === 'active').length || 0,
        inactive: users?.filter((u) => !u.is_active || u.status === 'inactive').length || 0,
        suspended: users?.filter((u) => u.status === 'suspended').length || 0,
        byRole: {},
      };

      // Contar por role
      users?.forEach((user) => {
        const role = user.role || 'unknown';
        statsData.byRole[role] = (statsData.byRole[role] || 0) + 1;
      });

      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <p className="text-3xl font-bold text-foreground">{stats.total}</p>
      </div>

      <div className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
          <UserCheck className="h-5 w-5 text-green-500" />
        </div>
        <p className="text-3xl font-bold text-green-600">{stats.active}</p>
      </div>

      <div className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Usuários Inativos</p>
          <UserX className="h-5 w-5 text-gray-500" />
        </div>
        <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
      </div>

      <div className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">Usuários Suspensos</p>
          <Shield className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
      </div>
    </div>
  );
}

