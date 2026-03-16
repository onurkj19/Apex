import type { AppRole } from '@/lib/erp-types';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  finance: 'Finance',
  project_manager: 'Project Manager',
  viewer: 'Viewer',
};

export const canDeleteFinance = (role?: AppRole | null) =>
  role === 'finance' || role === 'super_admin' || role === 'admin';

export const canAccessRoute = (role: AppRole | null | undefined, path: string) => {
  if (!role) return false;
  if (role === 'super_admin' || role === 'admin') return true;

  if (role === 'finance') {
    return !['/admin/workers', '/admin/content', '/admin/settings'].includes(path);
  }

  if (role === 'project_manager') {
    return !['/admin/finances', '/admin/profit-loss', '/admin/settings'].includes(path);
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
