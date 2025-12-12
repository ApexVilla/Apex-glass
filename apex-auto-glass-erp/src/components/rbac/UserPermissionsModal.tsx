/**
 * Modal para gerenciar permissões de um usuário específico
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserCog, Shield, Check, X, AlertTriangle } from 'lucide-react';
import {
  userRoleService,
  roleService,
  permissionService,
  userPermissionService,
  Role,
  Permission,
  UserPermission,
  UserWithRoles
} from '@/services/rbacService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onUpdate?: () => void;
}

export function UserPermissionsModal({
  open,
  onOpenChange,
  user,
  onUpdate,
}: UserPermissionsModalProps) {
  const { company } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData, userPermissionsData] = await Promise.all([
        roleService.listRoles(),
        permissionService.listPermissions(),
        userPermissionService.getUserPermissions(user!.id)
      ]);

      setRoles(rolesData);
      setPermissions(permissionsData);
      setUserPermissions(userPermissionsData);

      // Set current role
      if (user?.roles && user.roles.length > 0) {
        const firstRole = user.roles[0];
        setSelectedRoleId(firstRole.role_id || firstRole.role || '');
      } else {
        setSelectedRoleId('');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!user || !company || !selectedRoleId) return;

    try {
      setSaving(true);

      // Remover roles existentes do usuário nesta empresa
      const existingRoles = user.roles?.filter((r) => r.company_id === company.id) || [];
      for (const existingRole of existingRoles) {
        if (existingRole.role_id) {
          await userRoleService.removeRoleFromUser(
            user.id,
            existingRole.role_id,
            company.id
          );
        }
      }

      // Atribuir nova role
      await userRoleService.assignRoleToUser(user.id, selectedRoleId, company.id);

      toast({
        title: 'Sucesso',
        description: 'Role atribuída com sucesso',
      });

      onUpdate?.();
      // Não fechar o modal para permitir editar permissões individuais
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atribuir role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionOverride = async (permissionId: string, granted: boolean) => {
    if (!user || !company) return;

    try {
      // Check if override already exists with same value
      const existing = userPermissions.find(up => up.permission_id === permissionId);
      if (existing && existing.granted === granted) {
        // Remove override if clicking same state (toggle off)
        await userPermissionService.removeUserPermission(user.id, permissionId);
      } else {
        // Set new override
        await userPermissionService.setUserPermission(user.id, permissionId, granted, company.id);
      }

      // Reload permissions
      const updatedPermissions = await userPermissionService.getUserPermissions(user.id);
      setUserPermissions(updatedPermissions);

      toast({
        title: 'Permissão atualizada',
        description: 'Permissão individual atualizada com sucesso',
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar permissão',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveOverride = async (permissionId: string) => {
    if (!user) return;
    try {
      await userPermissionService.removeUserPermission(user.id, permissionId);
      const updatedPermissions = await userPermissionService.getUserPermissions(user.id);
      setUserPermissions(updatedPermissions);
    } catch (error) {
      console.error('Error removing override:', error);
    }
  };

  if (!user) return null;

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    const moduleName = perm.module?.name || 'Outros';
    if (!acc[moduleName]) acc[moduleName] = [];
    acc[moduleName].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Permissões: {user.full_name}
          </DialogTitle>
          <DialogDescription>
            Gerencie o perfil de acesso e permissões individuais
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roles">Perfil (Role)</TabsTrigger>
                <TabsTrigger value="permissions">Permissões Individuais</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="roles" className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Perfil Atual
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    O perfil define o conjunto base de permissões do usuário.
                  </p>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">Selecionar Perfil</label>
                      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles
                            .filter((r) => r.is_active)
                            .map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                                {role.is_system && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Sistema)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAssignRole} disabled={saving || !selectedRoleId}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Perfil
                    </Button>
                  </div>
                </div>

                {selectedRoleId && (
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Nota:</strong> Alterar o perfil redefinirá as permissões base.
                      Permissões individuais (overrides) serão mantidas e terão prioridade sobre o perfil.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-2 bg-muted/30 border-b">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Permissões individuais sobrescrevem as permissões do perfil.
                </p>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  {Object.entries(permissionsByModule).map(([moduleName, modulePermissions]) => (
                    <div key={moduleName} className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">
                        {moduleName}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePermissions.map((permission) => {
                          const override = userPermissions.find(up => up.permission_id === permission.id);
                          const isOverridden = !!override;
                          const isGranted = override?.granted;

                          return (
                            <div
                              key={permission.id}
                              className={`
                                flex items-center justify-between p-3 rounded-lg border 
                                ${isOverridden
                                  ? (isGranted ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-red-50 border-red-200 dark:bg-red-900/20')
                                  : 'bg-card'
                                }
                              `}
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{permission.name}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant={isOverridden && isGranted ? "default" : "ghost"}
                                  size="icon"
                                  className={`h-8 w-8 ${isOverridden && isGranted ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                  onClick={() => handlePermissionOverride(permission.id, true)}
                                  title="Permitir"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={isOverridden && !isGranted ? "destructive" : "ghost"}
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handlePermissionOverride(permission.id, false)}
                                  title="Negar"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                {isOverridden && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs ml-1"
                                    onClick={() => handleRemoveOverride(permission.id)}
                                  >
                                    Limpar
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
