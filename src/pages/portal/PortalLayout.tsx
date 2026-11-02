import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarOff, ClipboardCheck, Clock3, Home, LogOut } from 'lucide-react';
import { authApi } from '@/lib/erp-api';
import supabase from '@/lib/supabase';
import { canAccessPortal } from '@/lib/permissions';
import type { AppRole } from '@/lib/erp-types';
import { portalApi } from '@/lib/v2/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PortalProfile } from './context';

const tabs = [
  { to: '/portal', label: 'Heute', icon: Home, end: true },
  { to: '/portal/stunden', label: 'Stunden', icon: Clock3 },
  { to: '/portal/rapport', label: 'Rapport', icon: ClipboardCheck },
  { to: '/portal/urlaub', label: 'Urlaub', icon: CalendarOff },
  { to: '/portal/mehr', label: 'Mehr', icon: Bell },
];

const PortalLayout = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<{ loading: boolean; profile: PortalProfile | null }>({ loading: true, profile: null });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    authApi
      .getAdminSession()
      .then((session) => mounted && setState({ loading: false, profile: (session?.profile as PortalProfile | undefined) ?? null }))
      .catch(() => mounted && setState({ loading: false, profile: null }));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/admin/login', { replace: true });
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!state.profile) return;
    portalApi.notifications().then((rows) => setUnread(rows.filter((r) => !r.read_at).length)).catch(() => undefined);
  }, [state.profile]);

  if (state.loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (!state.profile) return <Navigate to="/admin/login" replace />;
  if (!canAccessPortal(state.profile.role as AppRole)) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Apex Gerüste</p>
          <p className="font-semibold leading-tight">{state.profile.full_name ?? state.profile.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abmelden"
          onClick={async () => {
            await authApi.logout();
            navigate('/admin/login', { replace: true });
          }}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </header>
      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">
        <Outlet context={{ profile: state.profile }} />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px]', isActive ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className="h-5 w-5" />
                {label}
                {to === '/portal/mehr' && unread > 0 && <span className="absolute right-[28%] top-1.5 h-2 w-2 rounded-full bg-red-500" />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default PortalLayout;
