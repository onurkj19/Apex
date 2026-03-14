import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';

const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useAdminAuth();

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

  return <Outlet />;
};

export default ProtectedRoute;
