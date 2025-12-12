/**
 * Componente de matriz de permissões
 * Exibe uma tabela visual onde cada módulo possui suas permissões
 */

import { useEffect, useState } from 'react';
import { moduleService, permissionService, rolePermissionService, Role } from '@/services/rbacService';
import { Module, Permission, RolePermission } from '@/services/rbacService';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PermissionMatrixProps {
  roleId: string;
  onUpdate?: () => void;
}

export function PermissionMatrix({ roleId, onUpdate }: PermissionMatrixProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar módulos e permissões
      const [modulesData, permissionsData, rolePermissionsData] = await Promise.all([
        moduleService.listModules(),
        permissionService.listPermissions(),
        rolePermissionService.getRolePermissions(roleId),
      ]);

      setModules(modulesData);
      setPermissions(permissionsData);

      // Criar mapa de permissões da role
      const permissionsMap: Record<string, boolean> = {};
      rolePermissionsData.forEach((rp) => {
        if (rp.granted) {
          permissionsMap[rp.permission_id] = true;
        }
      });
      setRolePermissions(permissionsMap);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar permissões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setRolePermissions((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const permissionsArray = Object.entries(rolePermissions).map(([permission_id, granted]) => ({
        permission_id,
        granted,
      }));

      await rolePermissionService.updateRolePermissions(roleId, permissionsArray);

      toast({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso',
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar permissões',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByModule = (moduleId: string) => {
    return permissions.filter((p) => p.module_id === moduleId);
  };

  const actionLabels: Record<string, string> = {
    access: 'Acessar',
    read: 'Visualizar',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
    export: 'Exportar',
    approve: 'Aprovar',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Matriz de Permissões</CardTitle>
            <CardDescription>
              Gerencie as permissões desta role por módulo e ação
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Salvar Permissões
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Módulo</TableHead>
                <TableHead className="text-center">Acessar</TableHead>
                <TableHead className="text-center">Visualizar</TableHead>
                <TableHead className="text-center">Criar</TableHead>
                <TableHead className="text-center">Editar</TableHead>
                <TableHead className="text-center">Excluir</TableHead>
                <TableHead className="text-center">Exportar</TableHead>
                <TableHead className="text-center">Aprovar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => {
                const modulePermissions = getPermissionsByModule(module.id);
                const actions = ['access', 'read', 'create', 'update', 'delete', 'export', 'approve'];

                return (
                  <TableRow key={module.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {module.icon && <span className="text-lg">{module.icon}</span>}
                        <span>{module.name}</span>
                      </div>
                    </TableCell>
                    {actions.map((action) => {
                      const permission = modulePermissions.find((p) => p.action === action);
                      if (!permission) {
                        return <TableCell key={action} className="text-center">-</TableCell>;
                      }

                      return (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={rolePermissions[permission.id] || false}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

