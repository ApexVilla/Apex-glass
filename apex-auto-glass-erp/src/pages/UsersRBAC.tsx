/**
 * Página de gerenciamento de Usuários com RBAC completo
 * Versão melhorada com sistema de permissões integrado
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import {
  Edit,
  Loader2,
  Plus,
  Trash2,
  KeyRound,
  UserCog,
  Shield,
  Filter,
} from 'lucide-react';
import { UserStatsCards } from '@/components/rbac/UserStatsCards';
import { ResetPasswordModal } from '@/components/rbac/ResetPasswordModal';
import { UserPermissionsModal } from '@/components/rbac/UserPermissionsModal';
import { userService, UserWithRoles } from '@/services/rbacService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditService, AuditLog } from '@/services/rbacService';

export default function UsersRBAC() {
  const { profile, company } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    password: string;
    phone: string;
    is_active: boolean;
    status: 'active' | 'inactive' | 'suspended';
  }>({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    is_active: true,
    status: 'active',
  });

  useEffect(() => {
    if (company?.id) {
      loadUsers();
    }
  }, [company?.id]);

  const loadUsers = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await userService.listUsers(company.id);
      setUsers(data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserLogs = async (userId: string) => {
    try {
      setLoadingLogs(true);
      const logs = await auditService.getUserLogs(userId, 20);
      setAuditLogs(logs);
    } catch (error: any) {
      console.error('Error loading logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenDialog = (user?: UserWithRoles) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        is_active: user.is_active,
        status: (user.status as any) || 'active',
      });
    } else {
      setSelectedUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        is_active: true,
        status: 'active',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedUser) {
        // Editar usuário existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            is_active: formData.is_active,
            status: formData.status,
          })
          .eq('id', selectedUser.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Usuário atualizado com sucesso',
        });
      } else {
        // Criar novo usuário
        if (!formData.email.trim()) {
          toast({
            title: 'Erro',
            description: 'Email é obrigatório',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        if (!formData.password.trim() || formData.password.length < 6) {
          toast({
            title: 'Erro',
            description: 'Senha é obrigatória e deve ter no mínimo 6 caracteres',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        if (!company?.id) {
          toast({
            title: 'Erro',
            description: 'Empresa não encontrada',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        const metadata = {
          full_name: formData.full_name,
          company_id: company.id,
        };

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        let userId: string | null = null;
        let isExistingUser = false;

        // Tratar caso de usuário já existente
        if (signUpError) {
          // Verificar se o erro é de usuário já registrado
          const isUserAlreadyRegistered = 
            signUpError.message?.includes('already registered') || 
            signUpError.message?.includes('User already registered') ||
            signUpError.message?.includes('already exists');
          
          if (isUserAlreadyRegistered) {
            // Buscar o perfil existente pelo email
            const { data: existingProfile, error: profileSearchError } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', formData.email)
              .maybeSingle();
            
            if (profileSearchError) {
              console.error('Erro ao buscar perfil existente:', profileSearchError);
              throw new Error('Usuário já está cadastrado, mas ocorreu um erro ao buscar o perfil. Entre em contato com o administrador.');
            }
            
            if (existingProfile?.id) {
              userId = existingProfile.id;
              isExistingUser = true;
              console.log('Usuário já existe, atualizando perfil:', userId);
            } else {
              throw new Error('Este email já está cadastrado no sistema. Se você já tem uma conta, faça login normalmente.');
            }
          } else {
            throw signUpError;
          }
        } else if (!authData?.user?.id) {
          throw new Error('Falha ao criar usuário');
        } else {
          userId = authData.user.id;
        }

        if (!userId) {
          throw new Error('Falha ao obter ID do usuário.');
        }

        // Se for um usuário novo, aguardar criação do perfil
        if (!isExistingUser) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Atualizar perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone: formData.phone || null,
            is_active: formData.is_active,
            status: formData.status,
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        toast({
          title: 'Sucesso',
          description: isExistingUser 
            ? 'Usuário atualizado com sucesso' 
            : 'Usuário criado com sucesso',
        });
      }

      setIsDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar usuário',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    if (userToDelete.id === profile?.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode excluir seu próprio usuário',
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      // Deletar roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (rolesError) console.error('Error deleting roles:', rolesError);

      // Deletar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso',
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir usuário',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (user: UserWithRoles, status: 'active' | 'inactive' | 'suspended') => {
    try {
      await userService.updateUserStatus(user.id, status);
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
      });
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleNames = (user: UserWithRoles) => {
    return user.roles?.map((r) => r.role_data?.name || r.role || 'Sem role').join(', ') || 'Sem role';
  };

  // Filtrar usuários
  const filteredUsers = users.filter((user) => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && !user.is_active) return false;
      if (filterStatus === 'inactive' && user.is_active) return false;
      if (filterStatus === 'suspended' && user.status !== 'suspended') return false;
    }
    // Filtro por role pode ser implementado aqui
    return true;
  });

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      cell: (item: UserWithRoles) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(item.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{item.full_name}</p>
            <p className="text-sm text-muted-foreground">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      cell: (item: UserWithRoles) => (
        <div className="flex flex-wrap gap-1">
          {item.roles && item.roles.length > 0 ? (
            item.roles.map((r) => (
              <Badge key={r.id} variant="secondary" className="text-xs">
                {r.role_data?.name || r.role || 'Sem role'}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Sem role</span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      cell: (item: UserWithRoles) => item.phone || '-',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item: UserWithRoles) => (
        <StatusBadge
          status={item.is_active && item.status === 'active' ? 'success' : 'danger'}
          label={
            item.status === 'suspended'
              ? 'Suspenso'
              : item.is_active
              ? 'Ativo'
              : 'Inativo'
          }
        />
      ),
    },
    {
      key: 'last_access',
      header: 'Último Acesso',
      cell: (item: UserWithRoles) =>
        item.last_access ? formatDate(item.last_access) : 'Nunca',
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      cell: (item: UserWithRoles) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedUser(item);
              setIsPermissionsOpen(true);
            }}
            title="Gerenciar Permissões"
          >
            <UserCog className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedUser(item);
              setIsResetPasswordOpen(true);
            }}
            title="Resetar Senha"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(item)}
            title="Editar usuário"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setUserToDelete(item);
              setIsDeleteDialogOpen(true);
            }}
            title="Excluir usuário"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários e Permissões</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários, roles e permissões do sistema
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-gradient">
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <UserStatsCards />

      {/* Filtros */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-status" className="text-sm">
            Status:
          </Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filter-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyMessage="Nenhum usuário encontrado"
      />

      {/* Dialog de criar/editar usuário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Atualize os dados do usuário'
                : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email {!selectedUser && '*'}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={!!selectedUser}
                required={!selectedUser}
              />
            </div>

            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value, is_active: value === 'active' })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Dialog de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário{' '}
              <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de reset de senha */}
      {selectedUser && (
        <ResetPasswordModal
          open={isResetPasswordOpen}
          onOpenChange={setIsResetPasswordOpen}
          userId={selectedUser.id}
          userName={selectedUser.full_name}
        />
      )}

      {/* Modal de permissões */}
      {selectedUser && (
        <UserPermissionsModal
          open={isPermissionsOpen}
          onOpenChange={setIsPermissionsOpen}
          user={selectedUser}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}

