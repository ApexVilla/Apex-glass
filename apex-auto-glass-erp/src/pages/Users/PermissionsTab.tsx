import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Shield, Users, ShoppingCart, Package, DollarSign, FileText, BarChart3, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Estrutura de permissões
export interface PermissionGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: {
    key: string;
    label: string;
  }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    id: 'geral',
    name: 'Geral',
    icon: Shield,
    permissions: [
      { key: 'acessar_painel', label: 'Acessar painel' },
      { key: 'ver_dashboard', label: 'Ver dashboard' },
      { key: 'gerenciar_usuarios', label: 'Gerenciar usuários' },
      { key: 'configurar_empresa', label: 'Configurar empresa' },
    ],
  },
  {
    id: 'vendas',
    name: 'Vendas',
    icon: ShoppingCart,
    permissions: [
      { key: 'criar_venda', label: 'Criar venda' },
      { key: 'editar_venda', label: 'Editar venda' },
      { key: 'cancelar_venda', label: 'Cancelar venda' },
      { key: 'aplicar_desconto', label: 'Aplicar desconto' },
      { key: 'emitir_nfe_nfce', label: 'Emitir NF-e/NFC-e' },
      { key: 'fechar_caixa', label: 'Fechar caixa' },
    ],
  },
  {
    id: 'estoque',
    name: 'Estoque',
    icon: Package,
    permissions: [
      { key: 'entrada_estoque', label: 'Entrada de estoque' },
      { key: 'saida_estoque', label: 'Saída de estoque' },
      { key: 'criar_produto', label: 'Criar produto' },
      { key: 'editar_produto', label: 'Editar produto' },
      { key: 'ver_saldo', label: 'Ver saldo' },
      { key: 'gerar_permissoes_separacao', label: 'Gerar Permissões - Separação com Conferência' },
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    icon: DollarSign,
    permissions: [
      { key: 'criar_conta_pagar', label: 'Criar conta a pagar' },
      { key: 'editar_conta_pagar', label: 'Editar conta a pagar' },
      { key: 'baixar_conta', label: 'Baixar conta' },
      { key: 'criar_conta_receber', label: 'Criar conta a receber' },
      { key: 'editar_conta_receber', label: 'Editar conta a receber' },
      { key: 'baixar_recebimento', label: 'Baixar recebimento' },
      { key: 'abrir_caixa', label: 'Abrir caixa' },
      { key: 'fechar_caixa_financeiro', label: 'Fechar caixa' },
      { key: 'ver_movimentacoes', label: 'Ver movimentações' },
    ],
  },
  {
    id: 'nfe',
    name: 'NF-e',
    icon: FileText,
    permissions: [
      { key: 'emitir_nfe', label: 'Emitir NF-e' },
      { key: 'cancelar_nfe', label: 'Cancelar NF-e' },
      { key: 'inutilizar_numero', label: 'Inutilizar número' },
      { key: 'importar_xml', label: 'Importar XML' },
      { key: 'consultar_notas', label: 'Consultar notas' },
    ],
  },
  {
    id: 'relatorios',
    name: 'Relatórios',
    icon: BarChart3,
    permissions: [
      { key: 'relatorio_financeiro', label: 'Relatório financeiro' },
      { key: 'relatorio_venda', label: 'Relatório de venda' },
      { key: 'relatorio_estoque', label: 'Relatório de estoque' },
      { key: 'exportar_pdf_excel', label: 'Exportar PDF/Excel' },
    ],
  },
  {
    id: 'sistema',
    name: 'Sistema',
    icon: Settings,
    permissions: [
      { key: 'backup', label: 'Backup' },
      { key: 'restaurar', label: 'Restaurar' },
      { key: 'ver_logs', label: 'Ver logs' },
      { key: 'acesso_api', label: 'Acesso API' },
    ],
  },
];

export type PermissionsData = Record<string, boolean>;

export function PermissionsTab() {
  const { company, profile } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  // Inicializar todas as permissões como false
  useEffect(() => {
    const initialPermissions: PermissionsData = {};
    permissionGroups.forEach((group) => {
      group.permissions.forEach((perm) => {
        initialPermissions[perm.key] = false;
      });
    });
    setPermissions(initialPermissions);
  }, []);

  // Carregar usuários
  useEffect(() => {
    if (company?.id) {
      loadUsers();
    }
  }, [company?.id]);

  // Carregar permissões quando selecionar um usuário
  useEffect(() => {
    if (selectedUserId) {
      loadPermissions(selectedUserId);
    } else {
      // Resetar permissões quando não há usuário selecionado
      const initialPermissions: PermissionsData = {};
      permissionGroups.forEach((group) => {
        group.permissions.forEach((perm) => {
          initialPermissions[perm.key] = false;
        });
      });
      setPermissions(initialPermissions);
      setLoading(false);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company?.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários',
        variant: 'destructive',
      });
    }
  };

  const loadPermissions = async (userId: string) => {
    try {
      setLoading(true);
      
      // Buscar role do usuário
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('company_id', company?.id)
        .maybeSingle();

      if (roleError && roleError.code !== 'PGRST116') {
        throw roleError;
      }

      // Se encontrou role, buscar permissões
      if (userRole?.role_id) {
        const { data: role, error: roleDataError } = await supabase
          .from('roles')
          .select('permissions')
          .eq('id', userRole.role_id)
          .maybeSingle();

        if (roleDataError && roleDataError.code !== 'PGRST116') {
          throw roleDataError;
        }

        if (role?.permissions && typeof role.permissions === 'object') {
          const rolePermissions = role.permissions as PermissionsData;
          // Mesclar com permissões padrão
          const mergedPermissions: PermissionsData = {};
          permissionGroups.forEach((group) => {
            group.permissions.forEach((perm) => {
              mergedPermissions[perm.key] = rolePermissions[perm.key] || false;
            });
          });
          setPermissions(mergedPermissions);
          setLoading(false);
          return;
        }
      }

      // Se não encontrou nada, usar permissões padrão (todas false)
      const defaultPermissions: PermissionsData = {};
      permissionGroups.forEach((group) => {
        group.permissions.forEach((perm) => {
          defaultPermissions[perm.key] = false;
        });
      });
      setPermissions(defaultPermissions);
    } catch (error: any) {
      console.error('Erro ao carregar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar permissões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId || !company?.id) {
      toast({
        title: 'Erro',
        description: 'Selecione um usuário primeiro',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const selectedUser = users.find((u) => u.id === selectedUserId);
      const userName = selectedUser?.full_name || 'Usuário';

      // Buscar role existente do usuário
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', selectedUserId)
        .eq('company_id', company.id)
        .maybeSingle();

      let roleId: string;

      if (userRole?.role_id) {
        // Atualizar permissões na role existente
        roleId = userRole.role_id;
        const { error: updateError } = await supabase
          .from('roles')
          .update({ 
            permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roleId);

        if (updateError) throw updateError;
      } else if (userRole && !userRole.role_id) {
        // Usuário tem registro em user_roles mas sem role_id - criar role e atualizar
        const roleName = `Permissões - ${userName}`;
        const { data: newRole, error: createRoleError } = await supabase
          .from('roles')
          .insert({
            name: roleName,
            description: `Permissões customizadas para ${userName}`,
            permissions,
            is_system: false,
          })
          .select()
          .single();

        if (createRoleError) throw createRoleError;
        roleId = newRole.id;

        // Atualizar user_roles com o role_id
        const { error: updateUserRoleError } = await supabase
          .from('user_roles')
          .update({ role_id: roleId })
          .eq('user_id', selectedUserId)
          .eq('company_id', company.id);

        if (updateUserRoleError) throw updateUserRoleError;
      } else {
        // Criar nova role para o usuário
        const roleName = `Permissões - ${userName}`;
        const { data: newRole, error: createRoleError } = await supabase
          .from('roles')
          .insert({
            name: roleName,
            description: `Permissões customizadas para ${userName}`,
            permissions,
            is_system: false,
          })
          .select()
          .single();

        if (createRoleError) throw createRoleError;
        roleId = newRole.id;

        // Vincular role ao usuário (usar upsert com constraint unique)
        const { error: linkError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: selectedUserId,
            role_id: roleId,
            role: 'custom', // Campo obrigatório
            company_id: company.id,
          }, {
            onConflict: 'user_id,company_id',
          });

        if (linkError) throw linkError;
      }

      toast({
        title: 'Sucesso',
        description: 'Permissões salvas com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar permissões',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="permissions">Permissão Usuários</TabsTrigger>
          <TabsTrigger value="generate">Gerar</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-6">
          {/* Seletor de Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Selecionar Usuário
              </CardTitle>
              <CardDescription>
                Selecione um usuário para gerenciar suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="user-select">Usuário</Label>
                  <Select
                    value={selectedUserId || ''}
                    onValueChange={(value) => setSelectedUserId(value || null)}
                  >
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Selecione um usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSavePermissions}
                  disabled={!selectedUserId || saving || loading}
                  className="btn-gradient"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Permissões
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Permissões */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedUserId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {permissionGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <Card key={group.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 border-b">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {group.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {group.permissions.map((permission) => (
                          <div
                            key={permission.key}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <Label
                              htmlFor={permission.key}
                              className="flex-1 cursor-pointer font-normal"
                            >
                              {permission.label}
                            </Label>
                            <Switch
                              id={permission.key}
                              checked={permissions[permission.key] || false}
                              onCheckedChange={() => handleTogglePermission(permission.key)}
                              className="data-[state=checked]:bg-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Selecione um usuário para gerenciar suas permissões
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Permissões</CardTitle>
              <CardDescription>
                Esta funcionalidade permite gerar permissões em lote para múltiplos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidade em desenvolvimento. Em breve você poderá gerar permissões para múltiplos usuários de uma vez.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
