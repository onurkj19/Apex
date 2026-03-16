import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { authApi, settingsApi, workerApi } from '@/lib/erp-api';
import { ROLE_LABELS } from '@/lib/permissions';
import type { AppRole } from '@/lib/erp-types';

const SettingsPage = () => {
  const [state, setState] = useState({
    darkMode: true,
    monthlyEmail: 'finance@apex-geruste.ch',
    largeExpenseThreshold: '2000',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'worker' as AppRole,
    worker_id: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const saved = await settingsApi.get();
        setState(saved);
      } catch (error: any) {
        alert(error?.message || 'Gabim gjate ngarkimit te cilesimeve.');
      } finally {
        setLoading(false);
      }
    };

    const loadAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const rows = await authApi.listAppUsers();
        setAdmins(rows);
      } catch (error: any) {
        alert(error?.message || 'Gabim gjate ngarkimit te statusit te adminave.');
      } finally {
        setLoadingAdmins(false);
      }
    };

    const loadWorkers = async () => {
      try {
        setWorkers(await workerApi.list());
      } catch {
        // keep page usable
      }
    };

    loadSettings();
    loadAdmins();
    loadWorkers();
    const interval = window.setInterval(loadAdmins, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleSave = async () => {
    const threshold = Number(state.largeExpenseThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      alert('Limiti i shpenzimit duhet te jete numer me i madh se 0.');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.save(state);
      alert('Cilesimet u ruajten me sukses.');
    } catch (error: any) {
      alert(error?.message || 'Gabim gjate ruajtjes se cilesimeve.');
    } finally {
      setSaving(false);
    }
  };

  const createAppUser = async () => {
    if (!userForm.full_name || !userForm.email || !userForm.password) {
      alert('Ploteso emrin, email-in dhe password.');
      return;
    }
    setCreatingUser(true);
    try {
      await authApi.createAppUser({
        full_name: userForm.full_name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        worker_id: userForm.role === 'worker' ? userForm.worker_id : null,
      });
      alert('Perdoruesi i ri u krijua.');
      setUserForm({ full_name: '', email: '', password: '', role: 'worker', worker_id: '' });
      setAdmins(await authApi.listAppUsers());
    } catch (error: any) {
      alert(error?.message || 'Nuk u arrit krijimi i perdoruesit.');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cilesimet e sistemit</h2>

      <Card>
        <CardHeader><CardTitle>Preferencat</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar cilesimet...</p>}
          <div className="flex items-center justify-between">
            <Label>Dark mode</Label>
            <Switch
              checked={state.darkMode}
              onCheckedChange={(v) => setState((s) => ({ ...s, darkMode: v }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Email i raporteve mujore</Label>
            <Input
              value={state.monthlyEmail}
              onChange={(e) => setState((s) => ({ ...s, monthlyEmail: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Limiti i shpenzimit te madh (CHF)</Label>
            <Input
              value={state.largeExpenseThreshold}
              onChange={(e) => setState((s) => ({ ...s, largeExpenseThreshold: e.target.value }))}
              disabled={loading || saving}
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? 'Duke ruajtur...' : 'Ruaj cilesimet'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Perdoruesit e app-it</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="border rounded-md p-3 space-y-3">
            <p className="font-medium">Krijo user te ri (admin/worker)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="Emri i plote"
                value={userForm.full_name}
                onChange={(e) => setUserForm((s) => ({ ...s, full_name: e.target.value }))}
              />
              <Input
                placeholder="Email"
                value={userForm.email}
                onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))}
              />
              <Input
                placeholder="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={userForm.role}
                onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value as AppRole }))}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {userForm.role === 'worker' && (
                <div className="md:col-span-2 space-y-1">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm w-full"
                    value={userForm.worker_id}
                    onChange={(e) => setUserForm((s) => ({ ...s, worker_id: e.target.value }))}
                  >
                    <option value="">Pa lidhje me punetor (opsionale)</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Mund ta krijosh user-in edhe pa lidhje. Lidhjen me punetor mund ta vendosesh me vone.
                  </p>
                </div>
              )}
              <div className="md:col-span-2">
                <Button onClick={createAppUser} disabled={creatingUser}>
                  {creatingUser ? 'Duke krijuar...' : 'Krijo userin'}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoadingAdmins(true);
                try {
                  setAdmins(await authApi.listAppUsers());
                } finally {
                  setLoadingAdmins(false);
                }
              }}
              disabled={loadingAdmins}
            >
              {loadingAdmins ? 'Duke rifreskuar...' : 'Rifresko'}
            </Button>
          </div>
          {admins.map((admin) => (
            <div key={admin.id} className="border rounded p-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{admin.full_name}</p>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground mr-2">Roli:</label>
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    value={admin.role}
                    disabled={admin.role === 'super_admin'}
                    onChange={async (e) => {
                      const nextRole = e.target.value as AppRole;
                      try {
                        await authApi.updateUserRole(admin.id, nextRole);
                        setAdmins((prev) => prev.map((x) => (x.id === admin.id ? { ...x, role: nextRole } : x)));
                      } catch (error: any) {
                        alert(error?.message || 'Nuk u arrit ndryshimi i rolit.');
                      }
                    }}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {admin.role === 'super_admin' && (
                    <p className="text-[11px] text-red-500 mt-1">I mbrojtur (nuk preket)</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${admin.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {admin.is_online ? 'Online' : 'Offline'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {admin.last_seen_at
                    ? `Aktiv per here te fundit: ${new Date(admin.last_seen_at).toLocaleString('sq-AL')}`
                    : 'Pa aktivitet te regjistruar'}
                </p>
              </div>
            </div>
          ))}
          {!loadingAdmins && admins.length === 0 && (
            <p className="text-sm text-muted-foreground">Nuk ka admina te regjistruar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
