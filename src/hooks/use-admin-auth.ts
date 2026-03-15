import { useEffect, useState } from 'react';
import { authApi } from '@/lib/erp-api';

interface AdminState {
  loading: boolean;
  isAuthenticated: boolean;
  profile: any | null;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminState>({
    loading: true,
    isAuthenticated: false,
    profile: null,
  });

  const checkAuth = async () => {
    try {
      const session = await authApi.getAdminSession();
      setState({
        loading: false,
        isAuthenticated: Boolean(session),
        profile: session?.profile ?? null,
      });
    } catch {
      setState({
        loading: false,
        isAuthenticated: false,
        profile: null,
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    let mounted = true;
    const touch = async () => {
      if (!mounted) return;
      try {
        await authApi.setPresence(true);
      } catch {
        // Keep UI usable even if presence update fails.
      }
    };

    touch();
    const interval = window.setInterval(touch, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') touch();
    };
    const onBeforeUnload = () => {
      void authApi.setPresence(false);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      void authApi.setPresence(false);
    };
  }, [state.isAuthenticated]);

  return { ...state, refreshAuth: checkAuth };
};
