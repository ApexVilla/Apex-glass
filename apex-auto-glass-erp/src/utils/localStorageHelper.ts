/**
 * Helper functions para leitura segura do localStorage
 * Implementa validação, tratamento de erros e auto-correção
 */

/**
 * Limpa todos os dados relacionados ao Apex Glass do localStorage
 * e redireciona para a tela de login
 */
export const clearAuthDataAndRedirect = () => {
  try {
    console.warn('⚠️ Dados corrompidos detectados. Limpando localStorage e redirecionando para login...');
    
    // Lista de todas as chaves relacionadas ao Apex Glass
    const apexGlassKeys = [
      'apex-glass-selected-company',
      'apex-glass-selected-company-id',
      'apex-glass-remember-email',
      'apex-glass-remember-company',
      'apex-glass-auth',
    ];
    
    // Remover chaves específicas do Apex Glass
    apexGlassKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Erro ao remover chave ${key}:`, error);
      }
    });
    
    // Remover todas as chaves relacionadas ao Supabase
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const keyLower = key.toLowerCase();
          if (
            keyLower.includes('supabase') ||
            keyLower.includes('sb-') ||
            keyLower.startsWith('supabase.auth.token') ||
            keyLower.includes('auth-token')
          ) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Erro ao remover chave ${key}:`, error);
        }
      });
    }
    
    // Limpar sessionStorage também
    try {
      sessionStorage.removeItem('apex-glass-just-logged-out');
    } catch (error) {
      console.error('Erro ao limpar sessionStorage:', error);
    }
    
    console.log('✅ localStorage limpo com sucesso');
    
    // Redirecionar para login após um pequeno delay para garantir que tudo foi limpo
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
    
  } catch (error) {
    console.error('❌ Erro crítico ao limpar dados:', error);
    // Em caso de erro crítico, tentar limpar tudo e redirecionar
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (criticalError) {
      console.error('❌ Erro crítico ao limpar tudo:', criticalError);
      // Último recurso: recarregar a página
      window.location.reload();
    }
  }
};

/**
 * Lê uma string do localStorage de forma segura
 * @param key - Chave do localStorage
 * @param defaultValue - Valor padrão se não encontrar ou houver erro
 * @returns Valor lido ou defaultValue
 */
export const safeGetItem = (key: string, defaultValue: string | null = null): string | null => {
  try {
    if (typeof window === 'undefined' || !localStorage) {
      return defaultValue;
    }
    
    const value = localStorage.getItem(key);
    
    // Se não existe, retornar defaultValue
    if (value === null) {
      return defaultValue;
    }
    
    // Validar que é uma string válida (não vazia após trim)
    if (typeof value !== 'string') {
      console.warn(`⚠️ Valor inválido no localStorage para chave "${key}": não é uma string`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    // Validar que não é uma string vazia ou apenas espaços
    const trimmed = value.trim();
    if (trimmed === '') {
      console.warn(`⚠️ Valor vazio no localStorage para chave "${key}"`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return value;
    
  } catch (error) {
    console.error(`❌ Erro ao ler localStorage chave "${key}":`, error);
    
    // Se for um erro de formato (JSON inválido, etc), limpar e redirecionar
    if (error instanceof SyntaxError || error instanceof TypeError) {
      console.warn('⚠️ Erro de formato detectado, limpando dados...');
      clearAuthDataAndRedirect();
      return defaultValue;
    }
    
    // Para outros erros, apenas retornar defaultValue
    return defaultValue;
  }
};

/**
 * Lê e faz parse de um JSON do localStorage de forma segura
 * @param key - Chave do localStorage
 * @param defaultValue - Valor padrão se não encontrar ou houver erro
 * @returns Objeto parseado ou defaultValue
 */
export const safeGetJSON = <T = any>(key: string, defaultValue: T | null = null): T | null => {
  try {
    const value = safeGetItem(key);
    
    if (value === null) {
      return defaultValue;
    }
    
    // Tentar fazer parse do JSON
    const parsed = JSON.parse(value);
    
    // Validar que o resultado não é null ou undefined
    if (parsed === null || parsed === undefined) {
      console.warn(`⚠️ JSON parseado é null/undefined para chave "${key}"`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return parsed as T;
    
  } catch (error) {
    console.error(`❌ Erro ao fazer parse de JSON do localStorage chave "${key}":`, error);
    
    // Se for erro de parse JSON, remover a chave corrompida
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.error('Erro ao remover chave corrompida:', removeError);
    }
    
    // Se for erro de formato, limpar tudo e redirecionar
    if (error instanceof SyntaxError) {
      console.warn('⚠️ JSON inválido detectado, limpando dados...');
      clearAuthDataAndRedirect();
    }
    
    return defaultValue;
  }
};

/**
 * Valida se um valor é uma string UUID válida
 * @param value - Valor a validar
 * @returns true se for UUID válido
 */
export const isValidUUID = (value: string | null): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value.trim());
};

/**
 * Lê uma string UUID do localStorage de forma segura
 * @param key - Chave do localStorage
 * @param defaultValue - Valor padrão se não encontrar ou houver erro
 * @returns UUID válido ou defaultValue
 */
export const safeGetUUID = (key: string, defaultValue: string | null = null): string | null => {
  try {
    const value = safeGetItem(key, defaultValue);
    
    if (value === null) {
      return defaultValue;
    }
    
    // Validar formato UUID
    if (!isValidUUID(value)) {
      console.warn(`⚠️ Valor não é um UUID válido para chave "${key}":`, value);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return value;
    
  } catch (error) {
    console.error(`❌ Erro ao ler UUID do localStorage chave "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Limpa dados corrompidos do localStorage de forma segura
 * Remove apenas chaves específicas do Apex Glass, não limpa tudo
 */
export const cleanCorruptedData = (): void => {
  try {
    console.log('🧹 Verificando e limpando dados corrompidos do localStorage...');
    
    const apexGlassKeys = [
      'apex-glass-selected-company',
      'apex-glass-selected-company-id',
      'apex-glass-remember-email',
      'apex-glass-remember-company',
    ];
    
    let cleaned = false;
    
    // Validar e limpar cada chave
    apexGlassKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          // Tentar validar o valor
          try {
            // Se for JSON, tentar fazer parse
            if (value.startsWith('{') || value.startsWith('[')) {
              JSON.parse(value);
            }
            // Se for UUID, validar formato
            if (key.includes('id') || key.includes('uuid')) {
              if (!isValidUUID(value)) {
                console.warn(`⚠️ Removendo ${key} com valor inválido:`, value);
                localStorage.removeItem(key);
                cleaned = true;
              }
            }
          } catch (parseError) {
            // Se não conseguir fazer parse, remover
            console.warn(`⚠️ Removendo ${key} com dados corrompidos:`, parseError);
            localStorage.removeItem(key);
            cleaned = true;
          }
        }
      } catch (error) {
        // Se houver erro ao ler, tentar remover
        console.warn(`⚠️ Erro ao validar ${key}, removendo:`, error);
        try {
          localStorage.removeItem(key);
          cleaned = true;
        } catch (removeError) {
          console.error(`❌ Erro ao remover ${key}:`, removeError);
        }
      }
    });
    
    if (cleaned) {
      console.log('✅ Dados corrompidos limpos do localStorage');
    } else {
      console.log('✅ Nenhum dado corrompido encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados corrompidos:', error);
    // Em caso de erro crítico, não fazer nada para não quebrar a aplicação
  }
};

/**
 * Valida se os dados do localStorage estão em formato correto
 * Executa validações básicas e retorna true se tudo estiver OK
 * Limpa automaticamente dados corrompidos encontrados
 */
export const validateLocalStorageData = (): boolean => {
  try {
    // Primeiro, limpar dados corrompidos
    cleanCorruptedData();
    
    // Validar chave de empresa selecionada
    const companyKey = safeGetItem('apex-glass-selected-company');
    const companyId = safeGetUUID('apex-glass-selected-company-id');
    
    // Se ambas existem, devem ser válidas
    if (companyKey !== null && companyId === null) {
      console.warn('⚠️ Empresa selecionada tem nome mas não tem ID válido');
      localStorage.removeItem('apex-glass-selected-company');
      return false;
    }
    
    if (companyId !== null && companyKey === null) {
      console.warn('⚠️ Empresa selecionada tem ID mas não tem nome');
      localStorage.removeItem('apex-glass-selected-company-id');
      return false;
    }
    
    // Validar email lembrado (se existir)
    const rememberedEmail = safeGetItem('apex-glass-remember-email');
    if (rememberedEmail !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rememberedEmail)) {
        console.warn('⚠️ Email lembrado não é válido');
        localStorage.removeItem('apex-glass-remember-email');
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao validar dados do localStorage:', error);
    // Se houver erro, limpar dados corrompidos e retornar false
    try {
      cleanCorruptedData();
    } catch (cleanError) {
      console.error('❌ Erro ao limpar dados após validação:', cleanError);
    }
    return false;
  }
};

