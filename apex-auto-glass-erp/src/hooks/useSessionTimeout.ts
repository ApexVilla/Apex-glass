import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 horas em milissegundos
const CHECK_INTERVAL_MS = 60 * 1000; // Verificar a cada 1 minuto
const LAST_ACTIVITY_KEY = 'apex-glass-last-activity';

/**
 * Hook para gerenciar timeout de sessão
 * Desconecta o usuário após 4 horas de inatividade
 */
export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Atualizar última atividade
  const updateLastActivity = () => {
    if (user) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  };

  // Verificar se a sessão expirou
  const checkSessionExpiry = () => {
    if (!user) return;

    const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivityStr) {
      // Se não há registro de atividade, considerar como agora
      updateLastActivity();
      return;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;

    if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
      // Sessão expirada - desconectar
      console.log('Sessão expirada por inatividade. Desconectando...');
      signOut();
    }
  };

  useEffect(() => {
    if (!user) {
      // Limpar timers se não há usuário logado
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      // Limpar última atividade
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      return;
    }

    // Inicializar última atividade ao fazer login
    updateLastActivity();

    // Eventos que indicam atividade do usuário
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // Adicionar listeners para rastrear atividade
    const handleActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Verificar expiração periodicamente
    checkIntervalRef.current = setInterval(() => {
      checkSessionExpiry();
    }, CHECK_INTERVAL_MS);

    // Verificar imediatamente ao montar
    checkSessionExpiry();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, signOut]);

  // Verificar ao carregar a página e quando a página volta a ficar visível
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          const now = Date.now();
          const timeSinceLastActivity = now - lastActivity;

          if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
            // Sessão já expirou enquanto estava fora
            console.log('Sessão expirada por inatividade. Desconectando...');
            signOut();
          } else {
            // Atualizar última atividade ao voltar para a aba
            updateLastActivity();
          }
        } else {
          // Se não há registro, criar um agora (pode ser primeira vez ou após recarregar)
          updateLastActivity();
        }
      }
    };

    // Aguardar um pouco antes de verificar para dar tempo da sessão ser restaurada ao recarregar
    const timeoutId = setTimeout(() => {
      handleVisibilityChange();
    }, 1000);

    // Adicionar listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, signOut]);
}

