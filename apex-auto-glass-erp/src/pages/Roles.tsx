/**
 * Página de gerenciamento de Roles (Perfis de Acesso)
 */

import { useEffect, useState } from 'react';
import { roleService, Role } from '@/services/rbacService';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Loader2, Shield, Settings } from 'lucide-react';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
  }>({
    name: '',
    slug: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await roleService.listRoles(true);
      setRoles(data);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar roles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        name: role.name,
        slug: role.slug,
        description: role.description || '',
        is_active: role.is_active,
      });
    } else {
      setSelectedRole(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: selectedRole ? formData.slug : generateSlug(name),
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: 'Erro',
        description: 'Slug é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      if (selectedRole) {
        await roleService.updateRole(selectedRole.id, formData);
        toast({
          title: 'Sucesso',
          description: 'Role atualizada com sucesso',
        });
      } else {
        await roleService.createRole({
          ...formData,
          is_system: false,
          company_id: null,
        });
        toast({
          title: 'Sucesso',
          description: 'Role criada com sucesso',
        });
      }

      setIsDialogOpen(false);
      loadRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar role',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      toast({
        title: 'Erro',
        description: 'Roles do sistema não podem ser deletadas',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar a role "${role.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await roleService.deleteRole(role.id);
      toast({
        title: 'Sucesso',
        description: 'Role deletada com sucesso',
      });
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao deletar role',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPermissions = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionDialogOpen(true);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      cell: (item: Role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium">{item.name}</span>
          {item.is_system && (
            <Badge variant="secondary" className="text-xs">
              Sistema
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      cell: (item: Role) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{item.slug}</code>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      cell: (item: Role) => (
        <span className="text-sm text-muted-foreground">
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: (item: Role) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      cell: (item: Role) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenPermissions(item)}
            title="Gerenciar Permissões"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(item)}
            title="Editar role"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {!item.is_system && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item)}
              title="Deletar role"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles e Permissões</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os perfis de acesso e permissões do sistema
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-gradient">
          <Plus className="mr-2 h-4 w-4" />
          Nova Role
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        emptyMessage="Nenhuma role encontrada"
      />

      {/* Dialog de criar/editar role */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? 'Editar Role' : 'Nova Role'}
            </DialogTitle>
            <DialogDescription>
              {selectedRole
                ? 'Atualize os dados da role'
                : 'Crie um novo perfil de acesso'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Vendedor Senior"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                }
                placeholder="Ex: vendedor_senior"
                required
              />
              <p className="text-xs text-muted-foreground">
                Identificador único (apenas letras, números e underscore)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva as responsabilidades desta role"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Role Ativa</p>
                <p className="text-sm text-muted-foreground">
                  Roles inativas não podem ser atribuídas
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="btn-gradient" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de permissões */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões - {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões desta role por módulo
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <PermissionMatrix
              roleId={selectedRole.id}
              onUpdate={() => {
                loadRoles();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

