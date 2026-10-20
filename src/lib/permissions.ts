import type { AppRole } from '@/lib/erp-types';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  finance: 'Finance',
  project_manager: 'Project Manager',
  viewer: 'Viewer',
  worker: 'Worker',
  team_leader: 'Vorarbeiter',
};

export const canDeleteFinance = (role?: AppRole | null) =>
  role === 'finance' || role === 'super_admin' || role === 'admin';

const APPROVERS: AppRole[] = ['super_admin', 'admin', 'project_manager'];
const PAYROLL_VIEWERS: AppRole[] = ['super_admin', 'admin', 'finance'];
const STAFF: AppRole[] = ['super_admin', 'admin', 'finance', 'project_manager'];

/** V2 routes are allow-listed explicitly so new screens never inherit legacy default-allow rules. */
export const V2_ROUTE_ROLES: Record<string, AppRole[]> = {
  '/admin/stunden': APPROVERS,
  '/admin/tagesrapporte': APPROVERS,
  '/admin/urlaub': APPROVERS,
  '/admin/unterakkord': STAFF,
  '/admin/kalender': STAFF,
  '/admin/samstag': PAYROLL_VIEWERS,
  '/admin/lohn': PAYROLL_VIEWERS,
  '/admin/finanz-unterakkord': PAYROLL_VIEWERS,
  '/admin/pdf-berichte': STAFF,
};

export const canPaySaturday = (role?: AppRole | null) => role === 'super_admin' || role === 'admin';
export const canEditPayroll = (role?: AppRole | null) => role === 'super_admin' || role === 'admin';
export const canApproveHours = (role?: AppRole | null) => !!role && APPROVERS.includes(role);

export const canAccessPortal = (role: AppRole | null | undefined) => role === 'worker' || role === 'team_leader';

export const homeRouteForRole = (role: AppRole | null | undefined) =>
  canAccessPortal(role) ? '/portal' : '/admin/dashboard';

export const canAccessRoute = (role: AppRole | null | undefined, path: string) => {
  if (!role) return false;
  if (path in V2_ROUTE_ROLES) return V2_ROUTE_ROLES[path].includes(role);
  if (role === 'team_leader') return false;
  if (role === 'super_admin') return true;
  if (role === 'admin') return !['/admin/leave-requests', '/admin/work-approvals'].includes(path);
  if (path === '/admin/shop-products' || path === '/admin/shop-orders') return false;

  if (role === 'worker') {
    return ['/admin/dashboard'].includes(path);
  }

  if (role === 'finance') {
    return !['/admin/workers', '/admin/content', '/admin/settings', '/admin/leave-requests', '/admin/work-approvals'].includes(path);
  }

  if (role === 'project_manager') {
    return !['/admin/finances', '/admin/profit-loss', '/admin/quotes-invoices', '/admin/reports', '/admin/settings', '/admin/leave-requests', '/admin/work-approvals'].includes(path);
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
