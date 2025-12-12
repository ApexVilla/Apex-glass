/**
 * Helper para garantir isolamento multi-tenant
 * Garante que todas as queries sempre usem empresa_id correto
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém a empresa_id ativa do usuário
 * Prioriza JWT, depois localStorage, depois profile
 */
export async function getCurrentEmpresaId(): Promise<string | null> {
  try {
    // 1. Tentar obter do JWT (mais confiável)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        if (payload.empresa_id) {
          return payload.empresa_id;
        }
      } catch (e) {
        // JWT não tem empresa_id, continuar
      }
    }

    // 2. Tentar obter do localStorage
    const savedEmpresaId = localStorage.getItem('apex-glass-selected-company-id');
    if (savedEmpresaId) {
      return savedEmpresaId;
    }

    // 3. Fallback: buscar do profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        return profile.company_id;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao obter empresa_id:', error);
    return null;
  }
}

/**
 * Garante que um objeto de dados tenha empresa_id
 * Usa empresa_id atual se não fornecido
 */
export async function ensureEmpresaId<T extends { company_id?: string | null }>(
  data: T
): Promise<T & { company_id: string }> {
  const empresaId = await getCurrentEmpresaId();
  
  if (!empresaId) {
    throw new Error('Empresa não selecionada. Por favor, selecione uma empresa.');
  }

  return {
    ...data,
    company_id: empresaId,
  };
}

/**
 * Wrapper para insert que garante empresa_id
 */
export async function safeInsert<T extends { company_id?: string | null }>(
  table: string,
  data: T | T[]
): Promise<{ data: any; error: any }> {
  const empresaId = await getCurrentEmpresaId();
  
  if (!empresaId) {
    return {
      data: null,
      error: { message: 'Empresa não selecionada' },
    };
  }

  const dataArray = Array.isArray(data) ? data : [data];
  const dataWithEmpresa = dataArray.map(item => ({
    ...item,
    company_id: empresaId,
  }));

  return await supabase.from(table).insert(dataWithEmpresa);
}

/**
 * Wrapper para update que garante filtro por empresa_id
 */
export async function safeUpdate<T extends { company_id?: string | null }>(
  table: string,
  data: T,
  filter: { id: string } | { [key: string]: any }
): Promise<{ data: any; error: any }> {
  const empresaId = await getCurrentEmpresaId();
  
  if (!empresaId) {
    return {
      data: null,
      error: { message: 'Empresa não selecionada' },
    };
  }

  // Garantir que o update inclua empresa_id no filtro
  const query = supabase
    .from(table)
    .update(data)
    .eq('company_id', empresaId);

  // Aplicar filtros adicionais
  Object.entries(filter).forEach(([key, value]) => {
    query.eq(key, value);
  });

  return await query;
}

/**
 * Wrapper para select que garante filtro por empresa_id
 */
export async function safeSelect<T = any>(
  table: string,
  columns: string = '*',
  additionalFilters?: { [key: string]: any }
): Promise<{ data: T[] | null; error: any }> {
  const empresaId = await getCurrentEmpresaId();
  
  if (!empresaId) {
    return {
      data: null,
      error: { message: 'Empresa não selecionada' },
    };
  }

  let query = supabase
    .from(table)
    .select(columns)
    .eq('company_id', empresaId);

  // Aplicar filtros adicionais
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
  }

  return await query;
}

/**
 * Atualiza o JWT com empresa_id
 * Deve ser chamado quando o usuário trocar de empresa
 */
export async function updateJwtWithEmpresaId(empresaId: string): Promise<{ error: Error | null }> {
  try {
    // Verificar se usuário tem acesso à empresa
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('Usuário não autenticado') };
    }

    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_has_empresa_access', { p_empresa_id: empresaId });

    if (accessError || !hasAccess) {
      return { error: new Error('Usuário não tem acesso a esta empresa') };
    }

    // Atualizar metadados do usuário (será incluído no próximo refresh do token)
    const { error: updateError } = await supabase.auth.updateUser({
      data: { empresa_id: empresaId }
    });

    if (updateError) {
      return { error: updateError as Error };
    }

    // Salvar no localStorage para uso imediato
    localStorage.setItem('apex-glass-selected-company-id', empresaId);

    // Forçar refresh do token para incluir empresa_id
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      return { error: refreshError as Error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

