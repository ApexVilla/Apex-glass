import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, User, Shield, DollarSign, ArrowRight, Lock, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPriceControlSettings, savePriceControlSettings, PriceControlSettings } from '@/services/priceControlService';
import { Combobox } from '@/components/ui/combobox';
import { sefazService } from '@/services/sefazService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const { profile, company, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPriceSettings, setLoadingPriceSettings] = useState(true);
  const [savingPriceSettings, setSavingPriceSettings] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
    cnpj: company?.cnpj || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
  });

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const [priceControlSettings, setPriceControlSettings] = useState<PriceControlSettings | null>(null);
  const [priceSettingsForm, setPriceSettingsForm] = useState({
    controle_preco_ativo: false,
    desconto_maximo_vendedor: 10,
    valor_minimo_sem_aprovacao: 0,
    usuarios_aprovadores: [] as string[],
  });

  const [fiscalConfig, setFiscalConfig] = useState({
    cnpj: '',
    uf: '',
    ambiente: 'homologacao' as 'homologacao' | 'producao',
    senha_certificado: '',
  });
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [loadingFiscalConfig, setLoadingFiscalConfig] = useState(false);
  const [savingFiscalConfig, setSavingFiscalConfig] = useState(false);

  const handleSaveCompany = async () => {
    if (!company?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', company.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Dados da empresa atualizados' });
      refreshProfile();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', profile.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Perfil atualizado' });
      refreshProfile();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Carregar configurações de controle de preço
  useEffect(() => {
    const loadPriceControlSettings = async () => {
      if (!company?.id) return;

      setLoadingPriceSettings(true);
      try {
        const settings = await getPriceControlSettings(company.id);
        if (settings) {
          setPriceControlSettings(settings);
          setPriceSettingsForm({
            controle_preco_ativo: settings.controle_preco_ativo,
            desconto_maximo_vendedor: settings.desconto_maximo_vendedor,
            valor_minimo_sem_aprovacao: settings.valor_minimo_sem_aprovacao,
            usuarios_aprovadores: settings.usuarios_aprovadores || [],
          });
        }
      } catch (error: any) {
        console.error('Erro ao carregar configurações de controle de preço:', error);
      } finally {
        setLoadingPriceSettings(false);
      }
    };

    const loadUsers = async () => {
      if (!company?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .in('role', ['admin', 'manager'])
          .order('full_name');

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    };

    loadPriceControlSettings();
    loadUsers();
    loadFiscalConfig();
  }, [company?.id]);

  const loadFiscalConfig = async () => {
    if (!company?.id) return;
    
    setLoadingFiscalConfig(true);
    try {
      const config = await sefazService.getFiscalConfig(company.id);
      if (config) {
        setFiscalConfig({
          cnpj: config.cnpj || '',
          uf: config.uf || '',
          ambiente: config.ambiente || 'homologacao',
          senha_certificado: '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações fiscais:', error);
    } finally {
      setLoadingFiscalConfig(false);
    }
  };

  const handleSaveFiscalConfig = async () => {
    if (!company?.id) return;

    setSavingFiscalConfig(true);
    try {
      // Converter arquivo para base64 (se houver)
      let certificadoBase64: string | null = null;
      if (certificadoFile) {
        const arrayBuffer = await certificadoFile.arrayBuffer();
        // Converter ArrayBuffer para base64 sem usar Buffer
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        certificadoBase64 = btoa(binary);
      }

      // Salvar no banco
      // Nota: O Supabase pode não aceitar BYTEA diretamente via JS, pode ser necessário usar uma função Edge ou converter
      const { error } = await supabase
        .from('fiscal_config')
        .upsert({
          company_id: company.id,
          cnpj: fiscalConfig.cnpj.replace(/\D/g, ''),
          uf: fiscalConfig.uf,
          ambiente: fiscalConfig.ambiente,
          // Por enquanto, vamos salvar apenas a referência do arquivo
          // Em produção, você pode usar Supabase Storage ou uma função Edge para salvar o certificado
          senha_certificado: fiscalConfig.senha_certificado || null,
        }, {
          onConflict: 'company_id'
        });

      if (error) throw error;

      // Se houver certificado, salvar em storage (opcional)
      if (certificadoFile && certificadoBase64) {
        // TODO: Implementar upload do certificado para Supabase Storage
        // Por enquanto, apenas avisar que o certificado precisa ser configurado no servidor
        toast({
          title: 'Atenção',
          description: 'Certificado selecionado. Em produção, configure o certificado no servidor.',
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações fiscais salvas com sucesso!',
      });

      setCertificadoFile(null);
      setFiscalConfig(prev => ({ ...prev, senha_certificado: '' }));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar configurações fiscais',
        variant: 'destructive',
      });
    } finally {
      setSavingFiscalConfig(false);
    }
  };

  const handleSavePriceControlSettings = async () => {
    if (!company?.id) return;

    setSavingPriceSettings(true);
    try {
      const settings = await savePriceControlSettings(company.id, priceSettingsForm);
      setPriceControlSettings(settings);
      toast({ title: 'Sucesso', description: 'Configurações de controle de preço salvas' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setSavingPriceSettings(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do sistema"
      />

      {/* Company Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Informações da sua empresa que aparecem em documentos e relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label htmlFor="company-cnpj">CNPJ</Label>
              <Input
                id="company-cnpj"
                value={companyData.cnpj}
                onChange={(e) => setCompanyData({ ...companyData, cnpj: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Telefone</Label>
              <Input
                id="company-phone"
                value={companyData.phone}
                onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                value={companyData.email}
                onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="company-address">Endereço</Label>
              <Input
                id="company-address"
                value={companyData.address}
                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                className="input-focus"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveCompany} className="btn-gradient" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Empresa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </CardTitle>
          <CardDescription>
            Suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome Completo</Label>
              <Input
                id="profile-name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Telefone</Label>
              <Input
                id="profile-phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Input
                value={
                  profile?.role === 'admin' ? 'Administrador' :
                  profile?.role === 'manager' ? 'Gerente' :
                  profile?.role === 'seller' ? 'Vendedor' : 'Instalador'
                }
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} className="btn-gradient" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Perfil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configurações Financeiras
          </CardTitle>
          <CardDescription>
            Gerencie as configurações do módulo financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate('/financial/natures')}>
              <div>
                <p className="font-medium">Naturezas Financeiras</p>
                <p className="text-sm text-muted-foreground">
                  Cadastre e gerencie as naturezas financeiras usadas em vendas, compras, contas a pagar, contas a receber, caixa e tesouraria
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Control Settings */}
      {(profile?.role === 'admin' || profile?.role === 'manager') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Controle de Preço e Permissões
            </CardTitle>
            <CardDescription>
              Configure as regras de controle de preço e aprovação de vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPriceSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="controle-ativo" className="text-base font-medium">
                        Ativar Controle de Preço
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativado, o sistema valida preços e exige aprovação para descontos acima do limite
                      </p>
                    </div>
                    <Switch
                      id="controle-ativo"
                      checked={priceSettingsForm.controle_preco_ativo}
                      onCheckedChange={(checked) =>
                        setPriceSettingsForm({ ...priceSettingsForm, controle_preco_ativo: checked })
                      }
                    />
                  </div>

                  {priceSettingsForm.controle_preco_ativo && (
                    <>
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="desconto-maximo">Desconto Máximo do Vendedor (%)</Label>
                          <Input
                            id="desconto-maximo"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={priceSettingsForm.desconto_maximo_vendedor}
                            onChange={(e) =>
                              setPriceSettingsForm({
                                ...priceSettingsForm,
                                desconto_maximo_vendedor: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Descontos acima deste valor exigirão aprovação
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="valor-minimo">Valor Mínimo sem Aprovação (R$)</Label>
                          <Input
                            id="valor-minimo"
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceSettingsForm.valor_minimo_sem_aprovacao}
                            onChange={(e) =>
                              setPriceSettingsForm({
                                ...priceSettingsForm,
                                valor_minimo_sem_aprovacao: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Valores abaixo deste exigirão aprovação mesmo com desconto permitido
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aprovadores">Usuários Aprovadores</Label>
                        <div className="space-y-2">
                          <Combobox
                            items={users.map((u) => ({
                              value: u.id,
                              label: `${u.full_name} (${u.email})`,
                            }))}
                            value=""
                            onChange={(userId) => {
                              if (userId && !priceSettingsForm.usuarios_aprovadores.includes(userId)) {
                                setPriceSettingsForm({
                                  ...priceSettingsForm,
                                  usuarios_aprovadores: [...priceSettingsForm.usuarios_aprovadores, userId],
                                });
                              }
                            }}
                            placeholder="Selecione um usuário para adicionar como aprovador..."
                            searchPlaceholder="Buscar usuário..."
                            emptyMessage="Nenhum usuário encontrado"
                          />
                          {priceSettingsForm.usuarios_aprovadores.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {priceSettingsForm.usuarios_aprovadores.map((userId) => {
                                const user = users.find((u) => u.id === userId);
                                if (!user) return null;
                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">
                                        {user.full_name} ({user.email})
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setPriceSettingsForm({
                                          ...priceSettingsForm,
                                          usuarios_aprovadores: priceSettingsForm.usuarios_aprovadores.filter(
                                            (id) => id !== userId
                                          ),
                                        })
                                      }
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Apenas administradores e gerentes podem ser aprovadores
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSavePriceControlSettings}
                    className="btn-gradient"
                    disabled={savingPriceSettings}
                  >
                    {savingPriceSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configurações
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fiscal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurações Fiscais
          </CardTitle>
          <CardDescription>
            Configure certificado digital, CNPJ, UF e ambiente para integração com SEFAZ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFiscalConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscal_cnpj">CNPJ da Empresa</Label>
                  <Input
                    id="fiscal_cnpj"
                    placeholder="00000000000000"
                    value={fiscalConfig.cnpj}
                    onChange={(e) => setFiscalConfig({ ...fiscalConfig, cnpj: e.target.value.replace(/\D/g, '') })}
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscal_uf">UF</Label>
                  <Select
                    value={fiscalConfig.uf}
                    onValueChange={(value) => setFiscalConfig({ ...fiscalConfig, uf: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscal_ambiente">Ambiente</Label>
                <Select
                  value={fiscalConfig.ambiente}
                  onValueChange={(value: 'homologacao' | 'producao') => setFiscalConfig({ ...fiscalConfig, ambiente: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use Homologação para testes e Produção para uso real
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="certificado">Certificado Digital A1 (.pfx)</Label>
                <Input
                  id="certificado"
                  type="file"
                  accept=".pfx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.name.endsWith('.pfx')) {
                        toast({
                          title: 'Erro',
                          description: 'Selecione um arquivo .pfx',
                          variant: 'destructive',
                        });
                        return;
                      }
                      setCertificadoFile(file);
                    }
                  }}
                />
                {certificadoFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {certificadoFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Certificado digital A1 em formato .pfx para autenticação na SEFAZ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha_certificado">Senha do Certificado</Label>
                <Input
                  id="senha_certificado"
                  type="password"
                  placeholder="Digite a senha do certificado"
                  value={fiscalConfig.senha_certificado}
                  onChange={(e) => setFiscalConfig({ ...fiscalConfig, senha_certificado: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Senha do certificado digital (será criptografada)
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveFiscalConfig}
                  disabled={savingFiscalConfig}
                >
                  {savingFiscalConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Configurações Fiscais
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Configurações de segurança da conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Alterar Senha</p>
              <p className="text-sm text-muted-foreground">
                Atualize sua senha regularmente para maior segurança
              </p>
            </div>
            <Button variant="outline">Alterar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
