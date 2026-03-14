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

  return { ...state, refreshAuth: checkAuth };
};
