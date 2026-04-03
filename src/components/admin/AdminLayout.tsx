import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Boxes, BriefcaseBusiness, CalendarDays, Clock3, ClipboardList, FileBadge2, FileText, FolderKanban, LayoutDashboard, LineChart, LogOut, Menu, Settings, Truck, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { authApi, notificationApi } from '@/lib/erp-api';
import supabase from '@/lib/supabase';
import { toast } from 'sonner';
import { canAccessRoute } from '@/lib/permissions';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import type { AppRole } from '@/lib/erp-types';
import { SensitiveScreenOverlay } from '@/components/admin/SensitiveScreenOverlay';

const items = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/projects', label: 'Projektet', icon: FolderKanban },
  { to: '/admin/workers', label: 'Punetoret', icon: Users },
  { to: '/admin/work-logs', label: 'Oret e Punes', icon: Clock3 },
  { to: '/admin/finances', label: 'Financat', icon: Wallet },
  { to: '/admin/profit-loss', label: 'Fitim/Humbje', icon: LineChart },
  { to: '/admin/contracts', label: 'Kontratat', icon: FileText },
  { to: '/admin/quotes-invoices', label: 'Oferta/Fatura', icon: FileBadge2 },
  { to: '/admin/inventory', label: 'Inventari', icon: Boxes },
  { to: '/admin/clients-equipment', label: 'Kliente/Pajisje', icon: Truck },
  { to: '/admin/content', label: 'Permbajtja Web', icon: BriefcaseBusiness },
  { to: '/admin/reports', label: 'Raportet', icon: BarChart3 },
  { to: '/admin/notifications', label: 'Njoftime', icon: Bell },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { to: '/admin/team-planning', label: 'Team Planning', icon: CalendarDays },
  { to: '/admin/leave-requests', label: 'Kerkesa Pushimi', icon: ClipboardList },
  { to: '/admin/work-approvals', label: 'Aprovimi Oreve', icon: ClipboardList },
  { to: '/admin/settings', label: 'Cilesimet', icon: Settings },
];

const AdminLayout = () => {
  const { profile } = useAdminAuth();
  const role = (profile?.role as AppRole | undefined) || null;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(search.trim().toLowerCase()) && canAccessRoute(role, item.to),
      ),
    [search, role],
  );

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const seenNotificationIds = new Set<string>();
    let initializedLiveFeed = false;

    const isStandaloneApp = () => {
      const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
      const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      return Boolean(standaloneMedia || iosStandalone);
    };

    const updateAppBadge = async (count: number) => {
      const nav = navigator as Navigator & {
        setAppBadge?: (value?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };

      try {
        if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
        if (count === 0 && nav.clearAppBadge) await nav.clearAppBadge();
      } catch {
        // Ignore unsupported badge API errors.
      }
    };

    const refreshUnreadCount = async () => {
      try {
        const count = await notificationApi.unreadCount();
        if (!mounted) return;
        setUnreadCount(count);
        await updateAppBadge(count);
        document.title = count > 0 ? `(${count}) Apex Admin` : 'Apex Gerüste GmbH - Professionelle Gerüstlösungen in der Schweiz';
      } catch {
        // Keep UI functional if unread counter fails.
      }
    };

    const pollLatestNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, message, is_archived')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error || !data) return;

        const rows = data as Array<{ id: string; title: string; message: string; is_archived: boolean }>;

        if (!initializedLiveFeed) {
          rows.forEach((row) => seenNotificationIds.add(row.id));
          initializedLiveFeed = true;
          return;
        }

        const freshRows = rows.filter((row) => !seenNotificationIds.has(row.id));
        rows.forEach((row) => seenNotificationIds.add(row.id));

        if (freshRows.length === 0) return;
        for (const row of freshRows.reverse()) {
          toast.message(row.title || 'Njoftim i ri', { description: row.message || '' });
          void sendLiveNotification(row.title || 'Njoftim i ri', row.message || '');
        }
      } catch {
        // Keep app working even if polling fails.
      }
    };

    const sendLiveNotification = async (title: string, body: string) => {
      if (!isStandaloneApp()) return;
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: '/pwa-192-custom.png',
            badge: '/pwa-192-custom.png',
            tag: `notif-${Date.now()}`,
            requireInteraction: true,
          });
          return;
        }
      } catch {
        // fallback below
      }

      try {
        new Notification(title, { body, icon: '/pwa-192-custom.png' });
      } catch {
        // Ignore unsupported notification calls.
      }
    };

    setNotificationPermission('Notification' in window ? Notification.permission : 'unsupported');
    void refreshUnreadCount();
    void pollLatestNotifications();

    const interval = window.setInterval(() => {
      void refreshUnreadCount();
      void pollLatestNotifications();
    }, 5_000);

    channel = supabase
      .channel(`admin-notifications-live-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          void refreshUnreadCount();

          if (payload.eventType !== 'INSERT') return;
          const row = payload.new as Record<string, unknown>;
          const rowId = String(row.id || '');
          if (rowId) seenNotificationIds.add(rowId);
          const title = String(row.title || 'Njoftim i ri');
          const message = String(row.message || '');
          toast.message(title, { description: message });
          void sendLiveNotification(title, message);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      window.clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Ky telefon/browser nuk e suporton Notification API.');
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        toast.success('Njoftimet u aktivizuan me sukses.');
      } else {
        toast.error('Leja per njoftime nuk u dha.');
      }
    } catch {
      toast.error('Nuk u arrit te aktivizohet leja e njoftimeve.');
    }
  };

  const onLogout = async () => {
    if (!window.confirm('A je i sigurt qe do te besh sign out?')) return;

    try {
      await authApi.setPresence(false);
    } catch {
      // Continue logout even if presence update fails.
    }
    await authApi.logout();
    navigate('/admin/login');
  };

  const renderNav = (isMobile = false) => (
    <nav className="space-y-1">
      {filteredItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => {
            if (isMobile) setMobileOpen(false);
          }}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`
          }
        >
          <span className="relative inline-flex">
            <item.icon className="h-4 w-4" />
            {item.to === '/admin/notifications' && unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/20 overflow-x-hidden">
      <div className="flex min-h-screen min-w-0">
        <aside className="w-72 shrink-0 border-r bg-background p-4 hidden md:block">
          <Link to="/admin/dashboard" className="block mb-6">
            <h1 className="text-lg font-bold">APEX GERUSTE MANAGEMENT</h1>
            <p className="text-sm text-muted-foreground">Sistemi i brendshem ERP</p>
          </Link>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kerko modul..."
            className="w-full mb-4 px-3 py-2 rounded-md border bg-background text-sm"
          />

          {renderNav()}
        </aside>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <header className="h-16 border-b bg-background flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 min-w-0">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden" aria-label="Hap menune">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[320px] sm:w-[360px] p-0 flex flex-col"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <SheetHeader className="p-4 pb-0 shrink-0">
                    <SheetTitle>Menu Administrimi</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 flex-1 overflow-y-auto p-4 pt-0">
                    <Link to="/admin/dashboard" className="block mb-4" onClick={() => setMobileOpen(false)}>
                      <h1 className="text-lg font-bold">APEX GERUSTE MANAGEMENT</h1>
                      <p className="text-sm text-muted-foreground">Sistemi i brendshem ERP</p>
                    </Link>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Kerko modul..."
                      className="w-full mb-4 px-3 py-2 rounded-md border bg-background text-sm"
                    />
                    {renderNav(true)}
                    <Button
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={async () => {
                        setMobileOpen(false);
                        await onLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Dil
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <p className="font-medium truncate min-w-0 text-sm sm:text-base">Paneli administrativ</p>
            </div>
            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
                  Aktivizo njoftimet
                </Button>
              )}
              <Button variant="outline" onClick={onLogout} className="hidden md:inline-flex">
                <LogOut className="h-4 w-4 mr-2" />
                Dil
              </Button>
            </div>
          </header>
          <section className="p-3 sm:p-4 md:p-6 min-w-0 max-w-full overflow-x-auto">
            <SensitiveScreenOverlay>
              <Outlet />
            </SensitiveScreenOverlay>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
