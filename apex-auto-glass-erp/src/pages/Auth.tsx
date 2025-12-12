import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  companyKey: z.string().min(1, 'A chave da empresa é obrigatória'),
});

export default function Auth() {
  const { user, loading, signIn, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  // Carregar empresas disponíveis quando necessário
  const loadCompaniesIfNeeded = async () => {
    // Se já carregou, não carregar novamente
    if (companiesLoaded || companies.length > 0) return;

    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')
        .limit(100); // Limitar resultados para performance
      
      if (error) throw error;
      setCompanies(data || []);
      setCompaniesLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Carregar empresas quando usuário master focar no campo ou começar a digitar
  const handleCompanyKeyFocus = () => {
    loadCompaniesIfNeeded();
  };

  // Carregar credenciais salvas ao montar o componente
  // IMPORTANTE: Só carregar empresa se não houver sessão ativa
  // Isso evita que após logout a empresa seja carregada automaticamente
  useEffect(() => {
    // Verificar se houve logout recente (flag temporária)
    const justLoggedOut = sessionStorage.getItem('apex-glass-just-logged-out');
    
    if (justLoggedOut) {
      // Limpar flag de logout
      sessionStorage.removeItem('apex-glass-just-logged-out');
      // Limpar empresa selecionada para forçar o usuário a escolher novamente
      setSelectedCompanyKey('');
    }
    
    const savedEmail = localStorage.getItem('apex-glass-remember-email');
    const savedCompany = localStorage.getItem('apex-glass-remember-company');
    
    // Só carregar email e empresa se NÃO houver usuário logado E não houve logout recente
    if (!user && !loading && !justLoggedOut) {
      if (savedEmail) {
        setLoginEmail(savedEmail);
        setRememberMe(true);
        // Só carregar empresa se houver email salvo (indica que foi marcado "lembrar")
        if (savedCompany) {
          setSelectedCompanyKey(savedCompany);
        }
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o usuário já está logado, redirecionar para o dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos os campos incluindo a chave da empresa
    try {
      loginSchema.parse({ 
        email: loginEmail, 
        password: loginPassword,
        companyKey: selectedCompanyKey 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    
    // Validar chave da empresa ANTES de fazer login
    if (!selectedCompanyKey || !selectedCompanyKey.trim()) {
      setIsLoading(false);
      toast({
        title: 'Chave da empresa obrigatória',
        description: 'Por favor, informe a chave da empresa para acessar o sistema.',
        variant: 'destructive',
      });
      return;
    }
    
    // Verificar se é usuário master
    const isMasterUser = loginEmail === 'villarroelsamir85@gmail.com' || loginEmail === 'samir@apexglass.com';
    
    // Buscar empresa ANTES de fazer login para validar acesso
    const trimmedKey = selectedCompanyKey.trim();
    
    // Função auxiliar para normalizar nome da empresa (remove espaços, acentos, converte para minúsculas)
    const normalizeCompanyName = (name: string) => {
      return name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '') // Remove todos os espaços
        .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
    };
    
    // Normalizar a chave de busca
    const searchKeyNormalized = normalizeCompanyName(trimmedKey);
    
    console.log('🔍 Buscando empresa:', {
      chaveOriginal: trimmedKey,
      chaveNormalizada: searchKeyNormalized
    });
    
    // Buscar TODAS as empresas disponíveis (sem filtro inicial para debug)
    // IMPORTANTE: Usuários anônimos podem buscar empresas graças à política RLS
    console.log('🔍 Tentando buscar empresas (usuário anônimo)...');
    
    let { data: allCompanies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    
    if (companyError) {
      console.error('❌ Erro ao buscar empresas:', {
        error: companyError,
        code: companyError.code,
        message: companyError.message,
        details: companyError.details,
        hint: companyError.hint
      });
      setIsLoading(false);
      toast({
        title: 'Erro ao buscar empresa',
        description: `Erro: ${companyError.message || 'Não foi possível buscar empresas. Verifique se a migração RLS foi aplicada.'}`,
        variant: 'destructive',
      });
      return;
    }
    
    console.log('📋 Total de empresas encontradas no banco:', allCompanies?.length || 0);
    if (allCompanies && allCompanies.length > 0) {
      console.log('📋 Empresas disponíveis:', allCompanies.map(c => ({ id: c.id, name: c.name })));
    } else {
      console.warn('⚠️ Nenhuma empresa encontrada no banco. Verifique:');
      console.warn('   1. Se existem empresas cadastradas no banco');
      console.warn('   2. Se a migração 20251229000000_allow_anonymous_company_search.sql foi aplicada');
      console.warn('   3. Se a política RLS permite acesso anônimo');
    }
    
    let companyData = null;
    
    if (allCompanies && allCompanies.length > 0) {
      // Buscar correspondência mais próxima usando normalização
      // Prioridade: 1) Nome exato (normalizado), 2) Começa com a chave, 3) Contém a chave
      companyData = allCompanies.find(c => {
        const normalizedName = normalizeCompanyName(c.name || '');
        return normalizedName === searchKeyNormalized;
      }) || allCompanies.find(c => {
        const normalizedName = normalizeCompanyName(c.name || '');
        return normalizedName.startsWith(searchKeyNormalized);
      }) || allCompanies.find(c => {
        const normalizedName = normalizeCompanyName(c.name || '');
        return normalizedName.includes(searchKeyNormalized);
      });
    }
    
    if (companyData) {
      console.log('✅ Empresa encontrada:', {
        nome: companyData.name,
        id: companyData.id,
        chaveBuscada: trimmedKey
      });
    } else {
      console.warn('⚠️ Empresa não encontrada:', {
        chaveBuscada: trimmedKey,
        chaveNormalizada: searchKeyNormalized,
        totalEmpresas: allCompanies?.length || 0
      });
    }
    
    // Se empresa não encontrada, bloquear login e mostrar empresas disponíveis
    if (!companyData) {
      setIsLoading(false);
      const empresasSugeridas = allCompanies?.slice(0, 5).map(c => c.name).join(', ') || 'Nenhuma';
      toast({
        title: 'Empresa não encontrada',
        description: `A empresa "${trimmedKey}" não foi encontrada. Empresas disponíveis: ${empresasSugeridas}${allCompanies && allCompanies.length > 5 ? '...' : ''}`,
        variant: 'destructive',
      });
      return;
    }
    
    // IMPORTANTE: Salvar empresa no localStorage ANTES de fazer login
    // Isso garante que quando onAuthStateChange disparar, o localStorage já estará atualizado
    localStorage.setItem('apex-glass-selected-company', companyData.name);
    localStorage.setItem('apex-glass-selected-company-id', companyData.id);
    console.log('✅✅✅ Auth.tsx - Empresa salva no localStorage ANTES do login:', {
      nome: companyData.name,
      id: companyData.id,
      chave_digitada: trimmedKey,
      verificacao: localStorage.getItem('apex-glass-selected-company'),
      verificacaoId: localStorage.getItem('apex-glass-selected-company-id')
    });
    
    // Fazer login para obter o usuário
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password: loginPassword 
    });
    
    if (signInError) {
      setIsLoading(false);
      let errorMessage = signInError.message;
      
      if (signInError.message === 'Invalid login credentials') {
        errorMessage = 'Email ou senha incorretos';
      }
      
      toast({
        title: 'Erro ao entrar',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }
    
    // Validar acesso do usuário à empresa (já encontrada anteriormente)
    if (authData?.user && companyData) {
      // Buscar perfil do usuário para verificar a empresa
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id, email')
        .eq('id', authData.user.id)
        .maybeSingle();
      
      if (!userProfile) {
        await supabase.auth.signOut();
        setIsLoading(false);
        toast({
          title: 'Erro',
          description: 'Perfil do usuário não encontrado. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        return;
      }
      
      // Validar acesso do usuário à empresa informada
      if (!isMasterUser) {
        // Usuário normal: deve estar vinculado à empresa informada
        if (userProfile.company_id !== companyData.id) {
          // Buscar nome da empresa do usuário para mensagem de erro
          const { data: userCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', userProfile.company_id)
            .maybeSingle();
          
          await supabase.auth.signOut();
          setIsLoading(false);
          toast({
            title: 'Acesso negado',
            description: `Você está vinculado à empresa "${userCompany?.name || 'outra empresa'}" e não pode acessar "${companyData.name}". Verifique a chave da empresa e tente novamente.`,
            variant: 'destructive',
          });
          return;
        }
        
        // Empresa já foi salva antes do login, apenas validar
        console.log('✅ Auth.tsx - Usuário normal validado com empresa:', companyData.name);
      } else {
        // Usuário master: empresa já foi salva antes do login
        console.log('✅ Auth.tsx - Usuário master validado com empresa:', companyData.name);
        
        // Define override no banco imediatamente para que as políticas RLS funcionem
        try {
          const { error: overrideError } = await supabase.rpc('set_user_company_override', {
            p_company_id: companyData.id
          });
          
          if (overrideError) {
            console.error('Erro ao definir override de empresa:', overrideError);
          } else {
            console.log('✅ Override definido no banco para empresa:', companyData.name);
          }
        } catch (error) {
          console.error('Erro ao chamar set_user_company_override:', error);
        }
      }
    }
    
    // Se chegou até aqui e não foi bloqueado, o login foi bem-sucedido
    
    // Remover flag de logout recente já que o login foi bem-sucedido
    sessionStorage.removeItem('apex-glass-just-logged-out');
    
    // Se lembrar senha estiver marcado, salvar email e empresa
    if (rememberMe) {
      localStorage.setItem('apex-glass-remember-email', loginEmail);
      if (selectedCompanyKey) {
        localStorage.setItem('apex-glass-remember-company', selectedCompanyKey);
      }
    } else {
      localStorage.removeItem('apex-glass-remember-email');
      localStorage.removeItem('apex-glass-remember-company');
    }
    
    // IMPORTANTE: Forçar refresh do perfil para atualizar o estado da empresa imediatamente
    // Isso garante que após salvar no localStorage, o estado seja atualizado sem precisar recarregar
    console.log('🔄 Forçando refresh do perfil após login...');
    try {
      // Aguardar um pouco para garantir que a sessão foi estabelecida
      await new Promise(resolve => setTimeout(resolve, 200));
      await refreshProfile();
      console.log('✅ Perfil atualizado após login');
    } catch (refreshError) {
      console.error('⚠️ Erro ao atualizar perfil após login (não crítico):', refreshError);
      // Não bloquear o login se falhar - o onAuthStateChange vai atualizar depois
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe seu email',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast({
        title: 'Erro',
        description: 'Email inválido',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar email de recuperação',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Apex-Glass</h1>
          <p className="text-muted-foreground mt-2">Sistema de Gestão para Auto Vidros</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" data-lpignore="true">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="input-focus"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      data-lpignore="true"
                      data-form-type="email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="input-focus pr-10"
                        autoComplete="current-password"
                        data-lpignore="false"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-key">
                      Empresa (Chave) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company-key-input"
                      type="text"
                      placeholder="Digite o nome da empresa"
                      value={selectedCompanyKey}
                      onChange={(e) => {
                        setSelectedCompanyKey(e.target.value);
                        // Carregar empresas quando começar a digitar
                        if (e.target.value.length > 0) {
                          loadCompaniesIfNeeded();
                        }
                      }}
                      onFocus={handleCompanyKeyFocus}
                      className="input-focus"
                      disabled={isLoading}
                      list="companies-list"
                      required
                    />
                    <datalist id="companies-list">
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.name} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      A chave da empresa é obrigatória para acessar o sistema. Digite o nome completo da empresa.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label
                        htmlFor="remember-me"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Lembrar senha
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                  <Button type="submit" className="w-full btn-gradient" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
          </CardContent>
        </Card>

        {/* Dialog Esqueci Minha Senha */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Redefinir Senha</DialogTitle>
              <DialogDescription>
                Digite seu email e enviaremos um link para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail('');
                }}
                disabled={isResetting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleForgotPassword}
                className="btn-gradient"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Email'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 Apex-Glass. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
