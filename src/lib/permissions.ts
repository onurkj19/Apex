import type { AppRole } from '@/lib/erp-types';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  finance: 'Finance',
  project_manager: 'Project Manager',
  viewer: 'Viewer',
  worker: 'Worker',
};

export const canDeleteFinance = (role?: AppRole | null) =>
  role === 'finance' || role === 'super_admin' || role === 'admin';

export const canAccessRoute = (role: AppRole | null | undefined, path: string) => {
  if (!role) return false;
  if (role === 'super_admin') return true;
  if (role === 'admin') return path !== '/admin/leave-requests';

  if (role === 'worker') {
    return ['/admin/dashboard'].includes(path);
  }

  if (role === 'finance') {
    return !['/admin/workers', '/admin/content', '/admin/settings', '/admin/leave-requests'].includes(path);
  }

  if (role === 'project_manager') {
    return !['/admin/finances', '/admin/profit-loss', '/admin/settings', '/admin/leave-requests'].includes(path);
  }

  if (role === 'viewer') {
    return [
      '/admin/dashboard',
      '/admin/projects',
      '/admin/work-logs',
      '/admin/contracts',
      '/admin/inventory',
      '/admin/clients-equipment',
      '/admin/notifications',
      '/admin/audit-logs',
      '/admin/team-planning',
    ].includes(path);
  }

  return false;
};
