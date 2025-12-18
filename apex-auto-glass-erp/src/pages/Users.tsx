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
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { Edit, Loader2, Plus, Trash2, Search } from 'lucide-react';
import type { Profile, UserRole } from '@/types/database';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionsTab } from './Users/PermissionsTab';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  installer: 'Instalador',
  stock: 'Estoque',
  separador: 'Separador',
  supervisor: 'Supervisor',
};

export default function Users() {
  const { profile, company } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyType, setCompanyType] = useState<'existing' | 'new'>('existing');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    is_active: boolean;
  }>({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'seller',
    is_active: true,
  });

  useEffect(() => {
    loadCompanies();
    if (company?.id) {
      setSelectedCompanyId(company.id);
    }
  }, [company]);

  // Carregar usuários apenas quando a empresa estiver disponível
  useEffect(() => {
    if (company?.id) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [company?.id]);

  const loadUsers = async () => {
    if (!company?.id) {
      // Se não há empresa, não fazer nada (aguardar que seja carregada)
      setLoading(false);
      setUsers([]);
      return;
    }

    try {
      setLoading(true);

      // Verificar se é usuário master (pode ver qualquer empresa)
      const isMasterUser = profile?.email === 'villarroelsamir85@gmail.com' || profile?.email === 'samir@apexglass.com';

      // Carregar usuários da empresa selecionada
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('company_id', company.id);

      // Para usuários master, não aplicar filtro de RLS (mas ainda filtrar por company_id)
      const { data, error } = await query.order('full_name');

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      const errorMessage = error.message || 'Erro ao carregar usuários';

      // Se o erro for de permissão, tentar recarregar o perfil
      if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        toast({
          title: 'Erro de permissão',
          description: 'Erro ao acessar usuários. Verificando permissões...',
          variant: 'destructive',
        });
        // Tentar recarregar o perfil
        setTimeout(() => {
          if (profile) {
            loadUsers();
          }
        }, 1000);
      } else {
        toast({
          title: 'Erro',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleOpenDialog = (user?: Profile) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        phone: user.phone || '',
        role: user.role,
        is_active: user.is_active,
      });
    } else {
      // Criar novo usuário - pré-selecionar empresa do admin
      setSelectedUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role: 'seller',
        is_active: true,
      });
      if (company?.id) {
        setSelectedCompanyId(company.id);
        setCompanyType('existing');
      } else if (companies.length > 0) {
        setSelectedCompanyId(companies[0].id);
        setCompanyType('existing');
      }
      setNewCompanyName('');
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
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', selectedUser.id);

        if (error) throw error;

        // Update user_roles table (upsert - cria se não existir)
        if (selectedUser.company_id) {
          // Primeiro, deletar roles existentes para este usuário nesta empresa
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', selectedUser.id)
            .eq('company_id', selectedUser.company_id);

          // Depois, inserir a nova role
          await supabase
            .from('user_roles')
            .insert({
              user_id: selectedUser.id,
              role: formData.role,
              company_id: selectedUser.company_id,
            });
        }

        toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso' });
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

        // Determinar empresa
        let finalCompanyId = company?.id || '';

        if (companyType === 'existing') {
          if (!selectedCompanyId) {
            toast({
              title: 'Erro',
              description: 'Selecione uma empresa',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }
          finalCompanyId = selectedCompanyId;
        } else {
          if (!newCompanyName.trim()) {
            toast({
              title: 'Erro',
              description: 'Nome da empresa é obrigatório',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }
          // Criar nova empresa primeiro
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({ name: newCompanyName })
            .select()
            .single();

          if (companyError) throw companyError;
          finalCompanyId = newCompany.id;
        }

        // Criar usuário usando signUp
        const metadata: Record<string, string> = {
          full_name: formData.full_name,
          company_id: finalCompanyId,
          role: formData.role,
        };

        // Configurar para não exigir confirmação de email (usuários criados por admin)
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/auth`,
            // Não exigir confirmação de email para usuários criados por admin
          },
        });

        let userId: string | null = null;
        let isExistingUser = false; // Rastrear se o usuário já existia

        // Tratar caso de usuário já existente
        if (signUpError) {
          console.error('Erro no signUp:', signUpError);
          
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
              // Se não encontrou o perfil, informar ao usuário
              throw new Error('Este email já está cadastrado no sistema. Se você já tem uma conta, faça login normalmente.');
            }
          } else {
            // Outros erros de signUp
            throw signUpError;
          }
        } else if (!authData?.user) {
          throw new Error('Falha ao criar usuário. Verifique se o email já está cadastrado.');
        } else if (!authData?.user?.id) {
          throw new Error('Falha ao criar usuário. Verifique se o email já está cadastrado.');
        } else {
          userId = authData.user.id;
        }

        if (!userId) {
          throw new Error('Falha ao obter ID do usuário.');
        }

        // Se for um usuário novo, aguardar triggers e confirmar email
        if (!isExistingUser) {
          // Aguardar para garantir que o trigger execute e o usuário seja criado completamente
          // O trigger auto_confirm_user_email e handle_new_user precisam executar primeiro
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Confirmar email do usuário automaticamente (usando RPC se disponível)
          try {
            const { error: confirmError } = await supabase.rpc('confirm_user_email', {
              user_email: formData.email
            });
            if (confirmError && !confirmError.message?.includes('already confirmed')) {
              console.warn('Aviso: Não foi possível confirmar email automaticamente:', confirmError);
            }
          } catch (error) {
            console.warn('Aviso: Função de confirmação de email não disponível:', error);
          }
        }

        // Verificar se o perfil já existe (pode ter sido criado pelo trigger)
        let existingProfile = null;
        
        // Se é um usuário existente, buscar o perfil diretamente
        if (isExistingUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, company_id')
            .eq('id', userId)
            .maybeSingle();
          existingProfile = profileData || null;
        } else {
          // Para usuário novo, fazer retry para aguardar o trigger
          let profileRetries = 0;
          const maxProfileRetries = 5;

          while (!existingProfile && profileRetries < maxProfileRetries) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, company_id')
              .eq('id', userId)
              .maybeSingle();

            existingProfile = profileData || null;

            if (!existingProfile) {
              profileRetries++;
              if (profileRetries < maxProfileRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }

        // Se não existe, criar manualmente com retry
        if (!existingProfile) {
          let createSuccess = false;
          let createRetries = 0;
          const maxCreateRetries = 3;

          while (!createSuccess && createRetries < maxCreateRetries) {
            // Preparar dados do perfil (sem phone se não existir no banco)
            const profileData: any = {
              id: userId,
              company_id: finalCompanyId,
              full_name: formData.full_name,
              email: formData.email,
              role: formData.role,
              is_active: formData.is_active,
            };
            
            // Adicionar phone apenas se fornecido (evita erro se coluna não existir)
            if (formData.phone) {
              profileData.phone = formData.phone;
            }
            
            const { error: profileError } = await supabase
              .from('profiles')
              .insert(profileData);

            if (profileError) {
              console.error(`Erro ao criar perfil (tentativa ${createRetries + 1}):`, profileError);

              // Se o erro for de coluna não encontrada (PGRST204), tentar sem phone
              if (profileError.code === 'PGRST204' && profileError.message?.includes('phone')) {
                console.warn('⚠️ Coluna phone não encontrada, tentando criar perfil sem phone...');
                // Tentar novamente sem phone
                const { error: retryError } = await supabase
                  .from('profiles')
                  .insert({
                    id: userId,
                    company_id: finalCompanyId,
                    full_name: formData.full_name,
                    email: formData.email,
                    role: formData.role,
                    is_active: formData.is_active,
                  });
                
                if (retryError) {
                  // Se ainda der erro, tratar como erro normal
                  profileError = retryError;
                } else {
                  createSuccess = true;
                  continue;
                }
              }

              // Se o erro for de chave estrangeira, o usuário ainda não existe - aguardar mais
              if (profileError.code === '23503') {
                createRetries++;
                if (createRetries < maxCreateRetries) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                } else {
                  throw new Error('Erro ao criar perfil: Usuário ainda não foi criado no sistema após várias tentativas. Por favor, aguarde alguns segundos e recarregue a página.');
                }
              }

              // Se erro de duplicata, o perfil já foi criado (talvez pelo trigger)
              if (profileError.code === '23505') {
                createSuccess = true;
                // Buscar o perfil criado
                const { data: createdProfile } = await supabase
                  .from('profiles')
                  .select('id, company_id')
                  .eq('id', userId)
                  .maybeSingle();
                existingProfile = createdProfile;
                break;
              }

              // Outros erros
              throw profileError;
            } else {
              createSuccess = true;
            }
          }
        }

        // Se o perfil existe (criado pelo trigger ou manualmente), atualizar com os dados corretos
        if (existingProfile) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              phone: formData.phone || null,
              is_active: formData.is_active,
              role: formData.role,
              company_id: finalCompanyId,
              full_name: formData.full_name,
            })
            .eq('id', userId);

          if (updateError) {
            console.error('Erro ao atualizar perfil:', updateError);
            // Não bloquear o sucesso se a atualização falhar (dados podem já estar corretos)
          }
        }

        // Aguardar um pouco antes de criar a role
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificar se a role já existe
        let { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('company_id', finalCompanyId)
          .maybeSingle();

        // Se não existe, criar manualmente
        if (!existingRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: formData.role,
              company_id: finalCompanyId,
            });

          if (roleError) {
            console.error('Erro ao criar role:', roleError);
            // Não bloquear o sucesso da criação do usuário por causa da role
          }
        } else {
          // Se já existe, atualizar
          const { error: roleUpdateError } = await supabase
            .from('user_roles')
            .update({
              role: formData.role
            })
            .eq('id', existingRole.id);

          if (roleUpdateError) {
            console.error('Erro ao atualizar role:', roleUpdateError);
          }
        }

        toast({
          title: 'Sucesso',
          description: isExistingUser 
            ? 'Usuário atualizado com sucesso!' 
            : 'Usuário criado com sucesso!',
        });
      }

      setIsDialogOpen(false);

      // Limpar formulário
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role: 'seller',
        is_active: true,
      });
      setSelectedCompanyId(company?.id || '');
      setCompanyType('existing');
      setNewCompanyName('');

      // Aguardar e recarregar lista de usuários
      await new Promise(resolve => setTimeout(resolve, 2000));
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

    // Não permitir excluir a si mesmo
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
      // Deletar roles do usuário
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (rolesError) {
        console.error('Erro ao deletar roles:', rolesError);
      }

      // Deletar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      // Deletar usuário do auth (isso vai deletar o perfil também por CASCADE)
      // Mas vamos tentar deletar diretamente via admin API se possível
      // Por enquanto, apenas deletar o perfil já remove o acesso

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso',
      });

      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
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

  const handleOpenDeleteDialog = (user: Profile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      cell: (item: Profile) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={item.avatar_url || ''} />
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
      key: 'role',
      header: 'Função',
      cell: (item: Profile) => (
        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
          {roleLabels[item.role] || item.role}
        </span>
      ),
    },
    { key: 'phone', header: 'Telefone', cell: (item: Profile) => item.phone || '-' },
    {
      key: 'is_active',
      header: 'Status',
      cell: (item: Profile) => (
        <StatusBadge
          status={item.is_active ? 'success' : 'danger'}
          label={item.is_active ? 'Ativo' : 'Inativo'}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Desde',
      cell: (item: Profile) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      cell: (item: Profile) => (
        <div className="flex items-center gap-1">
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
            onClick={() => handleOpenDeleteDialog(item)}
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
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários e permissões do sistema
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-gradient">
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {Object.entries(roleLabels).map(([role, label]) => {
              const count = users.filter(u => u.role === role && u.is_active).length;
              return (
                <div key={role} className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-sm text-muted-foreground">{label}s</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={filteredUsers}
            loading={loading}
            emptyMessage="Nenhum usuário encontrado"
          />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsTab />
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Atualize os dados e permissões do usuário'
                : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input-focus"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email {!selectedUser && '*'}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!selectedUser}
                className={selectedUser ? "bg-muted" : "input-focus"}
                required={!selectedUser}
              />
            </div>

            {!selectedUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-focus"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres
                  </p>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label>Empresa</Label>
                  <RadioGroup
                    value={companyType}
                    onValueChange={(value) => {
                      setCompanyType(value as 'existing' | 'new');
                      if (value === 'existing') {
                        // Sempre usar a empresa do admin logado por padrão
                        if (company?.id) {
                          setSelectedCompanyId(company.id);
                        } else if (companies.length > 0) {
                          setSelectedCompanyId(companies[0].id);
                        }
                      } else {
                        setSelectedCompanyId('');
                        setNewCompanyName('');
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing-company-user" />
                      <Label htmlFor="existing-company-user" className="font-normal cursor-pointer">
                        Empresa existente ({company?.name || 'Sua empresa'})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new-company-user" />
                      <Label htmlFor="new-company-user" className="font-normal cursor-pointer">
                        Criar nova empresa
                      </Label>
                    </div>
                  </RadioGroup>

                  {companyType === 'existing' ? (
                    <div className="space-y-2">
                      <Label htmlFor="select-company-user">Selecione a empresa</Label>
                      <Select
                        value={selectedCompanyId}
                        onValueChange={setSelectedCompanyId}
                        disabled={loadingCompanies}
                      >
                        <SelectTrigger id="select-company-user">
                          <SelectValue placeholder={loadingCompanies ? "Carregando..." : "Selecione uma empresa"} />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="new-company-name-user">Nome da nova empresa *</Label>
                      <Input
                        id="new-company-name-user"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        className="input-focus"
                        placeholder="Nome da empresa"
                        required
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="installer">Instalador</SelectItem>
                  <SelectItem value="stock">Estoque</SelectItem>
                  <SelectItem value="separador">Separador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A função define as permissões de acesso do usuário
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Usuário Ativo</p>
                <p className="text-sm text-muted-foreground">
                  Usuários inativos não podem acessar o sistema
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})?
              <br />
              <br />
              Esta ação não pode ser desfeita. O usuário perderá acesso ao sistema imediatamente.
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
    </div>
  );
}
