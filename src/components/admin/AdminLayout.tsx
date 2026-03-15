import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Boxes, BriefcaseBusiness, Clock3, FileBadge2, FileText, FolderKanban, LayoutDashboard, LineChart, LogOut, Menu, Settings, Truck, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { authApi } from '@/lib/erp-api';

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
  { to: '/admin/settings', label: 'Cilesimet', icon: Settings },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  );

  const onLogout = async () => {
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
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r bg-background p-4 hidden md:block">
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

        <main className="flex-1">
          <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden" aria-label="Hap menune">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0 flex flex-col">
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
              <p className="font-medium">Paneli administrativ</p>
            </div>
            <Button variant="outline" onClick={onLogout} className="hidden md:inline-flex">
              <LogOut className="h-4 w-4 mr-2" />
              Dil
            </Button>
          </header>
          <section className="p-3 sm:p-4 md:p-6">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
