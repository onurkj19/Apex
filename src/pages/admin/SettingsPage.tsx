import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { authApi, settingsApi, workerApi, workerGroupApi } from '@/lib/erp-api';
import { ROLE_LABELS } from '@/lib/permissions';
import type { AppRole, WorkerGroup } from '@/lib/erp-types';
import { WORKER_ROLE_OPTIONS } from '@/lib/worker-role-options';

const SettingsPage = () => {
  const { profile: currentProfile } = useAdminAuth();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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
  const [workerGroups, setWorkerGroups] = useState<WorkerGroup[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [syncingProfiles, setSyncingProfiles] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'worker' as AppRole,
    worker_id: '',
    worker_hourly_rate: '0',
    worker_job_role: WORKER_ROLE_OPTIONS[0].value,
    worker_group_name: '',
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

    const loadGroups = async () => {
      try {
        const rows = await workerGroupApi.list(true);
        setWorkerGroups(rows);
        setUserForm((prev) => ({
          ...prev,
          worker_group_name: prev.worker_group_name || rows.find((g) => g.is_active)?.name || 'Grupi A',
        }));
      } catch {
        setUserForm((prev) => ({ ...prev, worker_group_name: prev.worker_group_name || 'Grupi A' }));
      }
    };

    loadSettings();
    loadAdmins();
    loadWorkers();
    loadGroups();
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
    if (!userForm.email.includes('@')) {
      alert('Email nuk eshte valid.');
      return;
    }
    if (userForm.password.length < 6) {
      alert('Password duhet te kete te pakten 6 karaktere.');
      return;
    }
    setCreatingUser(true);
    try {
      const hourlyNum = Number(userForm.worker_hourly_rate);
      const workerDefaults =
        userForm.role === 'worker' && !userForm.worker_id
          ? {
              hourly_rate: Number.isFinite(hourlyNum) && hourlyNum >= 0 ? hourlyNum : 0,
              job_role: userForm.worker_job_role || WORKER_ROLE_OPTIONS[0].value,
              group_name: userForm.worker_group_name || 'Grupi A',
            }
          : null;

      await authApi.createAppUser({
        full_name: userForm.full_name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        worker_id: userForm.role === 'worker' ? userForm.worker_id || null : null,
        worker_defaults: workerDefaults,
      });
      alert('Perdoruesi i ri u krijua.' + (userForm.role === 'worker' && !userForm.worker_id ? ' U krijua edhe regjistrimi te Punetoret.' : ''));
      const firstGroup = workerGroups.find((g) => g.is_active)?.name || 'Grupi A';
      setUserForm({
        full_name: '',
        email: '',
        password: '',
        role: 'worker',
        worker_id: '',
        worker_hourly_rate: '0',
        worker_job_role: WORKER_ROLE_OPTIONS[0].value,
        worker_group_name: firstGroup,
      });
      setAdmins(await authApi.listAppUsers());
      setWorkers(await workerApi.list());
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
                <div className="md:col-span-2 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Lidh me punëtor ekzistues (opsionale)</Label>
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm w-full"
                      value={userForm.worker_id}
                      onChange={(e) => setUserForm((s) => ({ ...s, worker_id: e.target.value }))}
                    >
                      <option value="">— Krijo punëtor të ri automatikisht (i njëjti emër) —</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!userForm.worker_id && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md border bg-muted/30 p-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Grupi (plan / ekip)</Label>
                        <select
                          className="h-10 rounded-md border bg-background px-3 text-sm w-full"
                          value={userForm.worker_group_name || workerGroups.find((g) => g.is_active)?.name || 'Grupi A'}
                          onChange={(e) => setUserForm((s) => ({ ...s, worker_group_name: e.target.value }))}
                        >
                          {(workerGroups.length ? workerGroups.filter((g) => g.is_active) : [{ name: 'Grupi A', id: 'a', is_active: true }]).map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Roli në punë</Label>
                        <select
                          className="h-10 rounded-md border bg-background px-3 text-sm w-full"
                          value={userForm.worker_job_role}
                          onChange={(e) => setUserForm((s) => ({ ...s, worker_job_role: e.target.value }))}
                        >
                          {WORKER_ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Orë / CHF (fillim)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={userForm.worker_hourly_rate}
                          onChange={(e) => setUserForm((s) => ({ ...s, worker_hourly_rate: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Nëse nuk zgjedh punëtor ekzistues, krijohet automatikisht një rresht te <strong>Punëtorët</strong> (planifikim, kërkesa pushimi, ora) i lidhur me këtë login.
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
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                setSyncingProfiles(true);
                try {
                  const res = await authApi.syncMissingProfiles();
                  alert(
                    `Sinkronizimi u krye.\n` +
                      `Profile të reja: ${res.users_created}\n` +
                      `Punëtorë të lidhur: ${res.workers_linked}`,
                  );
                  setAdmins(await authApi.listAppUsers());
                  setWorkers(await workerApi.list());
                } catch (e: unknown) {
                  alert(e instanceof Error ? e.message : 'Gabim gjatë sinkronizimit.');
                } finally {
                  setSyncingProfiles(false);
                }
              }}
              disabled={syncingProfiles || loadingAdmins}
            >
              {syncingProfiles ? 'Duke sinkronizuar...' : 'Sinhronizo Auth → profile / punëtorë'}
            </Button>
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
          {admins.map((admin) => {
            const isProtected = admin.role === 'super_admin';
            const isSelf = currentProfile?.id === admin.id;
            const canDelete = !isProtected && !isSelf;

            return (
              <div key={admin.id} className="border rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{admin.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground mr-2">Roli:</label>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      value={admin.role}
                      disabled={isProtected}
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
                    {isProtected && (
                      <p className="text-[11px] text-red-500 mt-1">I mbrojtur (nuk preket)</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
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
                  {canDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deletingUserId === admin.id}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Fshi përdoruesin "${admin.full_name}" (${admin.email})?\n\nKjo heq edhe login-in nga Auth. Nëse ka punëtor të lidhur, provohet të fshihet edhe ai (mund të dështojë nëse ka orë/projekte).`,
                          )
                        ) {
                          return;
                        }
                        setDeletingUserId(admin.id);
                        try {
                          await authApi.deleteAppUser(admin.id);
                          setAdmins((prev) => prev.filter((x) => x.id !== admin.id));
                          setWorkers(await workerApi.list());
                        } catch (error: unknown) {
                          alert(error instanceof Error ? error.message : 'Fshirja deshtoi.');
                        } finally {
                          setDeletingUserId(null);
                        }
                      }}
                    >
                      {deletingUserId === admin.id ? 'Duke fshire...' : 'Fshi'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {!loadingAdmins && admins.length === 0 && (
            <p className="text-sm text-muted-foreground">Nuk ka admina te regjistruar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
