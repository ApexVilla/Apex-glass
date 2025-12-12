/**
 * Utilitário para tratamento seguro de erros em handlers
 */

export function safeHandler<T extends (...args: any[]) => any>(
  handler: T,
  errorMessage = 'Ocorreu um erro inesperado'
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    try {
      const result = handler(...args);
      // Se for uma Promise, trata o erro
      if (result && typeof result.catch === 'function') {
        result.catch((error: any) => {
          console.error('Erro no handler:', error);
          // Não quebra a aplicação, apenas loga o erro
        });
      }
    } catch (error: any) {
      console.error('Erro no handler:', error);
      // Não quebra a aplicação
    }
  };
}

export function safeAsyncHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  errorMessage = 'Ocorreu um erro inesperado'
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    try {
      await handler(...args);
    } catch (error: any) {
      console.error('Erro no handler assíncrono:', error);
      // Não quebra a aplicação
    }
  };
}

