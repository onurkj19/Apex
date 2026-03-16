import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { canAccessRoute } from '@/lib/permissions';
import type { AppRole } from '@/lib/erp-types';

const ProtectedRoute = () => {
  const { loading, isAuthenticated, profile } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const role = (profile?.role as AppRole | undefined) || null;
  const path = location.pathname === '/admin' ? '/admin/dashboard' : location.pathname;
  if (!canAccessRoute(role, path)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
