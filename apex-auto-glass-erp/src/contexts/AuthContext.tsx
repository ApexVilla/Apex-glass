import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Company } from '@/types/database';
import { 
  safeGetItem, 
  safeGetUUID, 
  validateLocalStorageData, 
  clearAuthDataAndRedirect 
} from '@/utils/localStorageHelper';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  isMasterUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, companyName: string, companyId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkPermission: (moduleSlug: string, action: string) => boolean;
  switchCompany: (companyId: string) => Promise<{ error: Error | null }>;
  getAllCompanies: () => Promise<Company[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isMasterUser, setIsMasterUser] = useState(false);
  
  // Wrapper para setLoading que atualiza também a ref
  const setLoadingState = (value: boolean) => {
    loadingRef.current = value;
    setLoading(value);
  };
  
  // Refs para evitar múltiplas chamadas simultâneas
  const fetchingProfileRef = useRef(false);
  const lastProcessedUserIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const initialSessionProcessedRef = useRef(false); // Ref para rastrear INITIAL_SESSION processado

  const fetchPermissions = async (userId: string) => {
    try {
      // Buscar user_roles primeiro (sem join para evitar recursão)
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      // Buscar roles separadamente usando os role_ids
      const roleIds = userRolesData?.map(ur => ur.role_id).filter(Boolean) || [];
      
      let rolesData: any[] = [];
      if (roleIds.length > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name, permissions')
          .in('id', roleIds);
        rolesData = roles || [];
      }

      const newPermissions = new Set<string>();

      // Processar permissões das roles (agora usando rolesData separado)
      rolesData.forEach((role: any) => {
        if (role.permissions) {
          // permissions é um JSONB array
          const rolePerms = role.permissions;
          if (Array.isArray(rolePerms)) {
            rolePerms.forEach((perm: any) => {
              if (perm === 'all') {
                // Se for "all", adiciona todas as permissões comuns
                ['dashboard', 'customers', 'suppliers', 'inventory', 'products', 'sales', 'financial', 'fiscal', 'reports', 'users', 'settings'].forEach(module => {
                  ['view', 'create', 'edit', 'delete'].forEach(action => {
                    newPermissions.add(`${module}.${action}`);
                  });
                });
              } else if (typeof perm === 'string') {
                // Permissão como string (ex: "dashboard.view")
                newPermissions.add(perm);
              } else if (perm.module && perm.action) {
                // Permissão como objeto
                newPermissions.add(`${perm.module}.${perm.action}`);
              }
            });
          }
        }
      });

      // Se for admin, dar acesso total
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileData?.role === 'admin' || profileData?.role === 'Admin') {
        // Admin tem todas as permissões
        ['dashboard', 'customers', 'suppliers', 'inventory', 'products', 'sales', 'financial', 'fiscal', 'reports', 'users', 'settings'].forEach(module => {
          ['view', 'create', 'edit', 'delete'].forEach(action => {
            newPermissions.add(`${module}.${action}`);
          });
        });
      }

      setPermissions(newPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Em caso de erro, se for admin, dar acesso total
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData?.role === 'admin' || profileData?.role === 'Admin') {
        const adminPerms = new Set<string>();
        ['dashboard', 'customers', 'suppliers', 'inventory', 'products', 'sales', 'financial', 'fiscal', 'reports', 'users', 'settings'].forEach(module => {
          ['view', 'create', 'edit', 'delete'].forEach(action => {
            adminPerms.add(`${module}.${action}`);
          });
        });
        setPermissions(adminPerms);
      }
    }
  };

  // Função auxiliar para normalizar nome da empresa (reutilizável)
  const normalizeCompanyName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '') // Remove todos os espaços
      .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
  };

  // Função auxiliar para buscar empresa por ID ou nome
  const findCompanyByIdOrName = async (companyId: string | null, companyKey: string | null): Promise<Company | null> => {
    if (!companyId && !companyKey) return null;

    // Priorizar ID se disponível (mais preciso)
    if (companyId) {
      const { data: companyById } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();
      
      if (companyById) {
        return companyById as Company;
      }
    }
    
    // Se não encontrou por ID, buscar por nome
    if (companyKey) {
      const trimmedKey = companyKey.trim();
      const searchKeyNormalized = normalizeCompanyName(trimmedKey);
      
      // Buscar TODAS as empresas disponíveis para fazer matching normalizado
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (allCompanies && allCompanies.length > 0) {
        // Encontrar a melhor correspondência usando normalização
        const companyByName = allCompanies.find(c => {
          const normalizedName = normalizeCompanyName(c.name || '');
          return normalizedName === searchKeyNormalized;
        }) || allCompanies.find(c => {
          const normalizedName = normalizeCompanyName(c.name || '');
          return normalizedName.startsWith(searchKeyNormalized);
        }) || allCompanies.find(c => {
          const normalizedName = normalizeCompanyName(c.name || '');
          return normalizedName.includes(searchKeyNormalized);
        });
        
        if (companyByName) {
          // Atualizar ID salvo para próxima vez
          localStorage.setItem('apex-glass-selected-company-id', companyByName.id);
          return companyByName as Company;
        }
      }
    }
    
    return null;
  };

  const fetchProfile = async (userId: string) => {
    // Evitar múltiplas chamadas simultâneas para o mesmo usuário
    if (fetchingProfileRef.current) {
      console.log('⏸️ fetchProfile já em execução, ignorando chamada duplicada');
      // Mesmo retornando cedo, garantir que loading seja false se o perfil já foi carregado
      if (profile && company) {
        setLoadingState(false);
      }
      return;
    }

    // Se já processamos este usuário recentemente, pular
    if (lastProcessedUserIdRef.current === userId && profile && company) {
      console.log('⏸️ Perfil já carregado para este usuário, ignorando chamada duplicada');
      setLoadingState(false);
      return;
    }

    fetchingProfileRef.current = true;
    lastProcessedUserIdRef.current = userId;

    try {
      // VALIDAÇÃO: Verificar se os dados do localStorage estão válidos ANTES de usar
      if (!validateLocalStorageData()) {
        console.warn('⚠️ Dados do localStorage inválidos detectados durante validação');
        // A validação já removeu os dados inválidos, continuar normalmente
      }

      // CRÍTICO: Verificar empresa selecionada e definir override ANTES de qualquer query
      // Isso garante que as políticas RLS funcionem corretamente desde o início
      // USAR FUNÇÕES SEGURAS para ler do localStorage
      const selectedCompanyKey = safeGetItem('apex-glass-selected-company');
      const selectedCompanyId = safeGetUUID('apex-glass-selected-company-id');
      
      console.log('🔍 fetchProfile - Empresa no localStorage:', {
        selectedCompanyKey,
        selectedCompanyId,
        userId
      });
      
      // Buscar perfil primeiro (não depende de company_id)
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        throw profileError;
      }
      
      if (!profileData) {
        console.warn('⚠️ Perfil não encontrado para userId:', userId);
        fetchingProfileRef.current = false;
        setLoadingState(false);
        return;
      }

      console.log('✅ Perfil encontrado:', {
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        company_id: profileData.company_id
      });
      
      // Verificar se é master user ANTES de definir override
      const userIsMaster = profileData?.email === 'villarroelsamir85@gmail.com' || profileData?.email === 'samir@apexglass.com';
      setIsMasterUser(userIsMaster);
      console.log('👤 Tipo de usuário:', userIsMaster ? 'MASTER' : 'REGULAR');

      // Buscar empresa selecionada (uma única vez, reutilizando função auxiliar)
      let companyData: Company | null = null;
      
      if (selectedCompanyId || selectedCompanyKey) {
        console.log('🔎 Buscando empresa:', { selectedCompanyId, selectedCompanyKey });
        companyData = await findCompanyByIdOrName(selectedCompanyId, selectedCompanyKey);
        
        if (companyData) {
          console.log('✅ Empresa encontrada:', {
            id: companyData.id,
            name: companyData.name,
            cnpj: companyData.cnpj
          });
        } else {
          // Empresa não encontrada, limpar localStorage usando funções seguras
          console.warn('⚠️ Empresa não encontrada com os dados fornecidos:', {
            selectedCompanyId,
            selectedCompanyKey
          });
          try {
            localStorage.removeItem('apex-glass-selected-company');
            localStorage.removeItem('apex-glass-selected-company-id');
            console.log('🧹 Dados da empresa removidos do localStorage');
          } catch (error) {
            console.error('Erro ao limpar seleção de empresa:', error);
          }
        }
      } else {
        console.log('ℹ️ Nenhuma empresa selecionada no localStorage');
      }

      // Definir override ANTES de qualquer outra operação (apenas para master users)
      if (companyData && userIsMaster) {
        try {
          const { error: overrideError } = await supabase.rpc('set_user_company_override', {
            p_company_id: companyData.id
          });
          
          if (overrideError) {
            console.error('Erro ao definir override:', overrideError);
          } else {
            console.log('✅ Override definido:', companyData.name, 'ID:', companyData.id);
          }
        } catch (error) {
          console.error('Erro ao chamar set_user_company_override:', error);
        }
      } else if (!companyData || !userIsMaster) {
        // Se não há empresa selecionada ou não é master, remover override
        try {
          await supabase.rpc('set_user_company_override', {
            p_company_id: null
          });
        } catch (error) {
          console.error('Erro ao remover override:', error);
        }
      }

      // Definir perfil e carregar permissões
      setProfile(profileData as Profile);
      fetchPermissions(userId);

      // Definir empresa no estado
      if (companyData) {
        console.log('📌 Definindo empresa selecionada no estado:', {
          name: companyData.name,
          id: companyData.id
        });
        setCompany(companyData);
        console.log('✅ Empresa definida com sucesso no estado!');
      } else if (profileData.company_id) {
        // Fallback: usar empresa padrão do perfil
        console.log('⚠️ Usando empresa padrão do perfil (fallback):', profileData.company_id);
        const { data: defaultCompanyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .maybeSingle();

        if (companyError) {
          console.error('❌ Erro ao buscar empresa padrão do perfil:', companyError);
        } else if (defaultCompanyData) {
          console.log('✅ Definindo empresa padrão do perfil:', {
            name: defaultCompanyData.name,
            id: defaultCompanyData.id
          });
          setCompany(defaultCompanyData as Company);
        } else {
          console.warn('⚠️ Empresa padrão do perfil não encontrada');
        }
      } else {
        console.warn('⚠️ Nenhuma empresa disponível - nem selecionada nem no perfil');
      }
      
      console.log('✅ fetchProfile concluído com sucesso');
      // Definir loading como false IMEDIATAMENTE após concluir com sucesso
      setLoadingState(false);
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      
      // Se for erro relacionado a dados corrompidos, limpar e redirecionar
      if (
        error instanceof SyntaxError || 
        error instanceof TypeError ||
        (error instanceof Error && (
          error.message.includes('JSON') ||
          error.message.includes('parse') ||
          error.message.includes('localStorage') ||
          error.message.includes('Unexpected')
        ))
      ) {
        console.error('❌ Erro de formato detectado no fetchProfile, limpando dados...');
        clearAuthDataAndRedirect();
        return;
      }
      
      // Para outros erros, apenas logar e continuar
      // Garantir que loading seja false mesmo em caso de erro
      setLoadingState(false);
    } finally {
      fetchingProfileRef.current = false;
      // Garantir duplamente que loading seja false após fetchProfile (backup)
      // Usar setTimeout menor para resposta mais rápida
      setTimeout(() => {
        setLoadingState(false);
      }, 50);
    }
  };

  useEffect(() => {
    let mounted = true;
    let sessionProcessed = false; // Flag para evitar processamento duplicado
    
    // TIMEOUT DE SEGURANÇA: Garantir que loading nunca trave indefinidamente
    const loadingTimeout = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn('⚠️ TIMEOUT: Loading travado há mais de 8 segundos, forçando desativação');
        console.warn('⚠️ Forçando desativação do loading e limpeza do estado');
        setLoadingState(false);
        // Limpar qualquer estado pendente
        if (mounted) {
          clearTimeout(loadingTimeout);
        }
      }
    }, 8000); // 8 segundos (reduzido para resposta mais rápida)

    // Função para processar a sessão
    const processSession = async (session: Session | null, skipIfProcessed = false) => {
      if (!mounted) return;

      // Evitar processamento duplicado da mesma sessão
      if (skipIfProcessed && sessionProcessed && session?.user?.id === lastProcessedUserIdRef.current) {
        console.log('⏸️ Sessão já processada, ignorando chamada duplicada');
        if (mounted) {
          setLoadingState(false);
          clearTimeout(loadingTimeout);
        }
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      try {
        if (session?.user) {
          // Verificar se a sessão ainda é válida
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at < now) {
            // Sessão expirada, fazer refresh
            console.log('Sessão expirada, tentando renovar...');
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError || !refreshData.session) {
                console.error('Erro ao renovar sessão:', refreshError);
                setSession(null);
                setUser(null);
                setProfile(null);
                setCompany(null);
                setPermissions(new Set());
                setIsMasterUser(false);
                setLoadingState(false);
                clearTimeout(loadingTimeout);
                return;
              }
              // Usar a sessão renovada
              session = refreshData.session;
              setSession(session);
              setUser(session.user);
            } catch (error) {
              console.error('Erro ao renovar sessão:', error);
              setSession(null);
              setUser(null);
              setProfile(null);
              setCompany(null);
              setPermissions(new Set());
              setIsMasterUser(false);
              setLoadingState(false);
              clearTimeout(loadingTimeout);
              return;
            }
          }

          // Processar perfil (sem delay desnecessário)
          await fetchProfile(session.user.id);
          sessionProcessed = true;
        } else {
          // Ao fazer logout, limpar override imediatamente
          try {
            await supabase.rpc('set_user_company_override', {
              p_company_id: null
            });
          } catch (error) {
            console.error('Erro ao limpar override no logout:', error);
          }
          
          setProfile(null);
          setCompany(null);
          setPermissions(new Set());
          setIsMasterUser(false);
          sessionProcessed = false;
          lastProcessedUserIdRef.current = null;
        }
      } catch (error) {
        console.error('❌ Erro ao processar sessão:', error);
        // Em caso de erro, garantir que loading seja false
        setLoadingState(false);
      } finally {
        // SEMPRE definir loading como false no final, independente do que aconteceu
        if (mounted) {
          setLoadingState(false);
          clearTimeout(loadingTimeout);
        }
      }
    };
    
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignorar INITIAL_SESSION se já foi processado (evita loops)
        if (event === 'INITIAL_SESSION' && initialSessionProcessedRef.current) {
          console.log('⏸️ INITIAL_SESSION já processado, ignorando');
          if (mounted) {
            setLoadingState(false);
          }
          return;
        }
        
        // Marcar INITIAL_SESSION como processado
        if (event === 'INITIAL_SESSION') {
          initialSessionProcessedRef.current = true;
        }
        
        // Log apenas para eventos importantes (não INITIAL_SESSION repetido)
        if (event !== 'INITIAL_SESSION' || !initialSessionProcessedRef.current) {
          console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        }
        
        // Se for evento de SIGNED_OUT, garantir que não restaure a sessão
        if (event === 'SIGNED_OUT') {
          console.log('✅ Logout confirmado pelo Supabase');
          initialSessionProcessedRef.current = false; // Reset para permitir nova sessão
          // Limpar estado completamente
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setCompany(null);
            setPermissions(new Set());
            setIsMasterUser(false);
            setLoadingState(false);
            clearTimeout(loadingTimeout);
          }
          sessionProcessed = false;
          lastProcessedUserIdRef.current = null;
          return;
        }
        
        // Verificar se houve logout recente antes de processar sessão
        // Usar try-catch para leitura segura do sessionStorage
        let justLoggedOut = false;
        try {
          justLoggedOut = sessionStorage.getItem('apex-glass-just-logged-out') === 'true';
        } catch (error) {
          console.error('Erro ao ler sessionStorage:', error);
          // Continuar normalmente se houver erro
        }
        
        if (justLoggedOut && !session) {
          console.log('⚠️ Logout recente detectado no listener, não processando sessão');
          try {
            sessionStorage.removeItem('apex-glass-just-logged-out');
          } catch (error) {
            console.error('Erro ao remover flag de logout:', error);
          }
          if (mounted) {
            setLoadingState(false);
            clearTimeout(loadingTimeout);
          }
          return;
        }
        
        // Para INITIAL_SESSION, pular se já foi processado
        const shouldSkip = event === 'INITIAL_SESSION' && sessionProcessed;
        await processSession(session, shouldSkip);
      }
    );

    // Verificar sessão existente ao montar o componente
    const initializeSession = async () => {
      try {
        // VALIDAÇÃO: Verificar dados do localStorage antes de inicializar
        if (!validateLocalStorageData()) {
          console.warn('⚠️ Dados do localStorage inválidos na inicialização');
          // A validação já removeu os dados inválidos, continuar normalmente
        }
        
        // Verificar se houve logout recente - se sim, não restaurar sessão
        // Usar try-catch para leitura segura do sessionStorage
        let justLoggedOut = false;
        try {
          justLoggedOut = sessionStorage.getItem('apex-glass-just-logged-out') === 'true';
        } catch (error) {
          console.error('Erro ao ler sessionStorage:', error);
          // Continuar normalmente se houver erro
        }
        
        if (justLoggedOut) {
          console.log('⚠️ Logout recente detectado, não restaurando sessão');
          try {
            sessionStorage.removeItem('apex-glass-just-logged-out');
          } catch (error) {
            console.error('Erro ao remover flag de logout:', error);
          }
          // Limpar qualquer sessão residual
          try {
            await supabase.auth.signOut();
          } catch (error) {
            // Ignorar erro se já não houver sessão
          }
          if (mounted) {
            setLoadingState(false);
            clearTimeout(loadingTimeout);
          }
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error);
          if (mounted) {
            setLoadingState(false);
            clearTimeout(loadingTimeout);
          }
          return;
        }

        if (session) {
          console.log('✅ Sessão restaurada:', {
            userId: session.user.id,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A',
            email: session.user.email
          });
          // Processar sessão inicial (não pular, pois é a primeira vez)
          await processSession(session, false);
        } else {
          console.log('ℹ️ Nenhuma sessão encontrada');
          if (mounted) {
            setLoadingState(false);
            clearTimeout(loadingTimeout);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error);
        
        // Se for erro relacionado a dados corrompidos, limpar e redirecionar
        if (
          error instanceof SyntaxError || 
          error instanceof TypeError ||
          (error instanceof Error && (
            error.message.includes('JSON') ||
            error.message.includes('parse') ||
            error.message.includes('localStorage') ||
            error.message.includes('Unexpected')
          ))
        ) {
          console.error('❌ Erro de formato detectado na inicialização, limpando dados...');
          clearAuthDataAndRedirect();
          return;
        }
        
        // Para outros erros, apenas garantir que loading seja false
        if (mounted) {
          setLoadingState(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []); // Array vazio - executar apenas uma vez na montagem

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string, companyId?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const metadata: Record<string, string> = {
      full_name: fullName,
      company_name: companyName,
    };

    // Se foi fornecido um company_id, adicionar aos metadados
    if (companyId) {
      metadata.company_id = companyId;
      metadata.role = 'seller'; // Usuário novo em empresa existente será seller por padrão
    } else {
      metadata.role = 'admin'; // Criador de nova empresa será admin
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
        // Desabilitar envio de email de confirmação
        captchaToken: undefined,
      },
    });

    // O email não precisa ser confirmado - login automático após criação
    if (data?.user) {
      // Aguardar um pouco para garantir que o usuário foi criado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Tentar fazer login automaticamente
      try {
        await supabase.auth.signInWithPassword({ email, password });
      } catch (loginErr) {
        console.log('Login automático não funcionou, usuário precisará fazer login manual');
      }
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Limpar estado imediatamente para resposta rápida
      setUser(null);
      setSession(null);
      setProfile(null);
      setCompany(null);
      setPermissions(new Set());
      setIsMasterUser(false);
      setLoadingState(false);
      
      // Limpar empresa selecionada ativa (nome e ID)
      localStorage.removeItem('apex-glass-selected-company');
      localStorage.removeItem('apex-glass-selected-company-id');
      
      // Marcar que houve logout recente (flag temporária na sessionStorage)
      // Isso impede que a empresa seja carregada automaticamente ao recarregar a página
      sessionStorage.setItem('apex-glass-just-logged-out', 'true');
      
      // NÃO limpar 'apex-glass-remember-company' para manter a preferência do usuário
      // Mas a flag acima garante que não será usada automaticamente após logout
      
      // Remover override e fazer logout - aguardar para garantir que seja limpo
      try {
        await supabase.rpc('set_user_company_override', { p_company_id: null });
      } catch (rpcError) {
        console.error('Erro ao remover override:', rpcError);
        // Continuar mesmo com erro
      }
      
      // Fazer logout do Supabase - CRÍTICO: aguardar para garantir que a sessão seja limpa
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Erro ao fazer logout:', signOutError);
      } else {
        console.log('✅ Logout realizado com sucesso');
      }
      
      // Limpar manualmente a sessão do localStorage como medida de segurança
      // O Supabase pode usar diferentes formatos de chave dependendo da configuração
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        
        // Buscar todas as chaves que podem conter dados do Supabase
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const keyLower = key.toLowerCase();
            // Verificar se a chave está relacionada ao Supabase
            // O Supabase pode usar: 'apex-glass-auth', 'sb-*-auth-token', 'supabase.auth.token', etc.
            if (keyLower.includes('supabase') || 
                keyLower.includes('sb-') || 
                key === 'apex-glass-auth' ||
                keyLower.startsWith('supabase.auth.token') ||
                keyLower.includes('auth-token')) {
              keysToRemove.push(key);
            }
          }
        }
        
        // Remover todas as chaves encontradas
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log('🗑️ Chave removida do localStorage:', key);
          } catch (error) {
            console.error('Erro ao remover chave:', key, error);
          }
        });
        
        // Log de todas as chaves restantes para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
          const remainingKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(Boolean);
          console.log('📋 Chaves restantes no localStorage:', remainingKeys);
        }
      }
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Mesmo com erro, garantir que o estado foi limpo acima
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    } else if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  const checkPermission = (moduleSlug: string, action: string): boolean => {
    if (!profile) return false;
    // Admin tem acesso total (case-insensitive)
    if (profile.role?.toLowerCase() === 'admin') return true;

    const key = `${moduleSlug}.${action}`;
    return permissions.has(key);
  };

  const switchCompany = async (companyId: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Usuário não autenticado') };
    }

    try {
      // Verificar se usuário tem acesso à empresa
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('user_has_empresa_access', { p_empresa_id: companyId });

      if (accessError || !hasAccess) {
        return { error: new Error('Usuário não tem acesso a esta empresa') };
      }

      // Buscar empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError || !companyData) {
        return { error: new Error('Empresa não encontrada') };
      }

      // Atualizar JWT com empresa_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: { empresa_id: companyId }
      });

      if (updateError) {
        console.error('Erro ao atualizar JWT:', updateError);
        return { error: updateError as Error };
      }

      // Salvar no localStorage
      localStorage.setItem('apex-glass-selected-company', companyData.name);
      localStorage.setItem('apex-glass-selected-company-id', companyData.id);
      
      // Forçar refresh do token para incluir empresa_id no JWT
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Erro ao atualizar sessão:', refreshError);
        return { error: refreshError as Error };
      }
      
      console.log('✅ Empresa trocada:', companyData.name, 'ID:', companyData.id);
      
      // Atualizar estado e recarregar perfil
      setCompany(companyData as Company);
      await refreshProfile();

      return { error: null };
    } catch (error) {
      console.error('Erro ao trocar de empresa:', error);
      return { error: error as Error };
    }
  };

  // Função auxiliar para remover empresas duplicadas (case-insensitive)
  const removeDuplicateCompanies = (companies: Company[]): Company[] => {
    const seen = new Map<string, Company>();
    
    for (const comp of companies) {
      const normalizedName = comp.name?.trim().toLowerCase() || '';
      
      // Se já vimos este nome, manter apenas a primeira (mais antiga) ou a que tem mais dados
      if (!seen.has(normalizedName)) {
        seen.set(normalizedName, comp);
      } else {
        const existing = seen.get(normalizedName)!;
        // Se a empresa atual é mais antiga ou tem mais informações, substituir
        const existingDate = existing.created_at ? new Date(existing.created_at).getTime() : 0;
        const currentDate = comp.created_at ? new Date(comp.created_at).getTime() : 0;
        
        if (currentDate < existingDate || 
            (comp.name && comp.name.trim() !== comp.name && existing.name === existing.name)) {
          seen.set(normalizedName, comp);
        }
      }
    }
    
    // Retornar array ordenado por nome
    return Array.from(seen.values()).sort((a, b) => {
      const nameA = (a.name || '').trim().toLowerCase();
      const nameB = (b.name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, 'pt-BR');
    });
  };

  const getAllCompanies = async (): Promise<Company[]> => {
    if (!isMasterUser) {
      return [];
    }

    try {
      // Para master user, usar RPC que bypassa RLS ou fazer query direta
      // Primeiro tentar usar uma função RPC se existir
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_companies_for_master');
      
      if (!rpcError && rpcData) {
        return removeDuplicateCompanies(rpcData as Company[]);
      }
      
      // Se RPC não existir, tentar query direta (pode não funcionar com RLS ativo)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao buscar empresas:', error);
        // Se falhar, retornar apenas a empresa atual
        return company ? [company] : [];
      }

      return removeDuplicateCompanies((data || []) as Company[]);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      return company ? [company] : [];
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      company,
      loading,
      isMasterUser,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      checkPermission,
      switchCompany,
      getAllCompanies,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
