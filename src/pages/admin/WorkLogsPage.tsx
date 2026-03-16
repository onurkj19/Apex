import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, UserPlus } from 'lucide-react';
import { clientApi, projectApi, workLogApi, workerApi } from '@/lib/erp-api';
import type { Project, WorkLog, Worker } from '@/lib/erp-types';
import { formatChf, formatNumberWithDots } from '@/lib/utils';

const QUICK_ROLES = [
  'Monter Skele',
  'Punetor Ndihmes',
  'Teknik Sigure',
  'Shofer Transporti',
  'Pergjegjes Ekipi',
  'Supervisor Kantieri',
  'Operator Makinerie',
  'Pergjegjes Magazina',
];

const WorkLogsPage = () => {
  const ALL_CLIENTS_VALUE = '__all_clients__';
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingManualWorker, setIsAddingManualWorker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(ALL_CLIENTS_VALUE);
  const [projectSearch, setProjectSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [manualWorker, setManualWorker] = useState({
    full_name: '',
    hourly_rate: '',
    role: 'Punetor Ndihmes',
  });
  const [form, setForm] = useState({
    project_id: '',
    location: '',
    work_date: '',
    hours_worked: '',
    hourly_rate_override: '',
  });

  const load = async () => {
    const [workersRes, projectsRes, logsRes, payrollRes, clientsRes] = await Promise.all([
      workerApi.list(),
      projectApi.list(),
      workLogApi.list(),
      workLogApi.getPayrollByMonth(),
      clientApi.list(),
    ]);
    setWorkers(workersRes);
    setProjects(projectsRes);
    setLogs(logsRes);
    setPayroll(payrollRes);
    setClients(clientsRes || []);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedWorkerNames = useMemo(
    () =>
      workers
        .filter((w) => selectedWorkerIds.includes(w.id))
        .map((w) => w.full_name),
    [workers, selectedWorkerIds],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'Ne pune'),
    [projects],
  );
  const activeProjectsByClient = useMemo(
    () =>
      activeProjects.filter((p) =>
        selectedClientId === ALL_CLIENTS_VALUE ? true : p.client_id === selectedClientId,
      ),
    [activeProjects, selectedClientId],
  );
  const clientNameById = useMemo(
    () =>
      clients.reduce<Record<string, string>>((acc, client) => {
        acc[client.id] = client.company_name;
        return acc;
      }, {}),
    [clients],
  );
  const filteredProjects = useMemo(
    () =>
      activeProjectsByClient.filter((p) =>
        [p.project_name, clientNameById[p.client_id || ''] || '']
          .join(' ')
          .toLowerCase()
          .includes(projectSearch.trim().toLowerCase()),
      ),
    [activeProjectsByClient, projectSearch, clientNameById],
  );
  const filteredLocations = useMemo(
    () =>
      activeProjectsByClient.filter((p) =>
        [p.location, clientNameById[p.client_id || ''] || '', p.project_name]
          .join(' ')
          .toLowerCase()
          .includes(locationSearch.trim().toLowerCase()),
      ),
    [activeProjectsByClient, locationSearch, clientNameById],
  );

  useEffect(() => {
    if (!form.project_id) return;
    const isStillActive = activeProjectsByClient.some((p) => p.id === form.project_id);
    if (!isStillActive) {
      setForm((prev) => ({ ...prev, project_id: '', location: '' }));
    }
  }, [activeProjectsByClient, form.project_id]);

  const toggleWorkerSelection = (workerId: string, checked: boolean) => {
    setSelectedWorkerIds((prev) => {
      if (checked) return prev.includes(workerId) ? prev : [...prev, workerId];
      return prev.filter((id) => id !== workerId);
    });
  };

  const addManualWorker = async () => {
    const fullName = manualWorker.full_name.trim();
    const hourlyRate = Number(manualWorker.hourly_rate);

    if (!fullName) {
      alert('Shkruaj emrin e punetorit.');
      return;
    }
    if (!manualWorker.hourly_rate || Number.isNaN(hourlyRate) || hourlyRate < 0) {
      alert('Paga/ore nuk eshte valide.');
      return;
    }
    if (!confirm('A je i sigurt qe do shtosh punetor manual?')) return;

    setIsAddingManualWorker(true);
    try {
      await workerApi.create({
        full_name: fullName,
        hourly_rate: hourlyRate,
        role: manualWorker.role,
      });
      await load();

      const refreshedWorkers = await workerApi.list();
      const created = refreshedWorkers.find(
        (w) =>
          w.full_name.toLowerCase() === fullName.toLowerCase() &&
          Number(w.hourly_rate) === hourlyRate &&
          w.role === manualWorker.role,
      );
      if (created) {
        setSelectedWorkerIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      }

      setManualWorker({
        full_name: '',
        hourly_rate: '',
        role: 'Punetor Ndihmes',
      });
    } finally {
      setIsAddingManualWorker(false);
    }
  };

  const applyProjectSelection = (projectId: string) => {
    const project = activeProjectsByClient.find((p) => p.id === projectId);
    if (!project) return;
    setForm((prev) => ({
      ...prev,
      project_id: project.id,
      location: project.location || prev.location,
      work_date: prev.work_date || new Date().toISOString().slice(0, 10),
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.project_id) {
      alert('Zgjidh projektin.');
      return;
    }
    if (!form.location.trim()) {
      alert('Zgjidh lokacionin.');
      return;
    }
    if (selectedWorkerIds.length === 0) {
      alert('Zgjidh te pakten nje punetor.');
      return;
    }

    const selectedWorkers = workers.filter((w) => selectedWorkerIds.includes(w.id));
    const overrideRate = form.hourly_rate_override.trim() ? Number(form.hourly_rate_override) : null;

    if (overrideRate !== null && Number.isNaN(overrideRate)) {
      alert('Paga/ore (override) nuk eshte valide.');
      return;
    }

    if (!confirm(`A je i sigurt qe do ruash evidencen per ${selectedWorkers.length} punetor(e)?`)) return;

    setIsSubmitting(true);
    try {
      await workLogApi.createMany(
        selectedWorkers.map((worker) => ({
          worker_id: worker.id,
          project_id: form.project_id,
          location: form.location,
          work_date: form.work_date,
          hours_worked: Number(form.hours_worked),
          hourly_rate: overrideRate ?? Number(worker.hourly_rate),
        })),
      );
      setForm({
        project_id: '',
        location: '',
        work_date: '',
        hours_worked: '',
        hourly_rate_override: '',
      });
      setSelectedWorkerIds([]);
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Evidenca e oreve te punes</h2>

      <Card>
        <CardHeader><CardTitle>Shto ore pune</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Punetoret (multi-zgjedhje)</Label>
              <div className="border rounded-md p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Menu className="h-4 w-4" />
                        Zgjidh punetoret
                      </span>
                      <span className="text-xs text-muted-foreground">{selectedWorkerIds.length} te zgjedhur</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[320px] max-h-72 overflow-y-auto">
                    <DropdownMenuLabel>Punetoret</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {workers.map((w) => (
                      <DropdownMenuCheckboxItem
                        key={w.id}
                        checked={selectedWorkerIds.includes(w.id)}
                        onCheckedChange={(checked) => toggleWorkerSelection(w.id, checked === true)}
                      >
                        {w.full_name} ({formatNumberWithDots(Number(w.hourly_rate))} CHF/h)
                      </DropdownMenuCheckboxItem>
                    ))}
                    {workers.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nuk ka punetore te regjistruar.
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWorkerIds(workers.map((w) => w.id))}
                >
                  Zgjidh te gjithe
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWorkerIds([])}
                >
                  Pastro zgjedhjen
                </Button>
              </div>
              {selectedWorkerNames.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Te zgjedhur: {selectedWorkerNames.join(', ')}
                </p>
              )}
              <div className="mt-4 border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">Shto punetor manual (shpejt)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Emri i punetorit"
                    value={manualWorker.full_name}
                    onChange={(e) => setManualWorker((s) => ({ ...s, full_name: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Paga/ore"
                    value={manualWorker.hourly_rate}
                    onChange={(e) => setManualWorker((s) => ({ ...s, hourly_rate: e.target.value }))}
                  />
                  <Select value={manualWorker.role} onValueChange={(v) => setManualWorker((s) => ({ ...s, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Roli" /></SelectTrigger>
                    <SelectContent>
                      {QUICK_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="secondary" onClick={addManualWorker} disabled={isAddingManualWorker}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isAddingManualWorker ? 'Duke shtuar...' : 'Shto manual'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Filtro sipas klientit</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Te gjithe klientet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLIENTS_VALUE}>Te gjithe klientet</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projekti</Label>
              <Input
                className="mb-2"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Kerko projekt ose klient..."
              />
              <Select value={form.project_id} onValueChange={applyProjectSelection}>
                <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                      {clientNameById[p.client_id || ''] ? ` - ${clientNameById[p.client_id || '']}` : ''}
                    </SelectItem>
                  ))}
                  {filteredProjects.length === 0 && (
                    <SelectItem value="__no_project__" disabled>Nuk ka projekte aktive me kete kerkese</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lokacioni</Label>
              <Input
                className="mb-2"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Kerko lokacion ose klient..."
              />
              <Select value={form.project_id} onValueChange={applyProjectSelection}>
                <SelectTrigger><SelectValue placeholder="Zgjidh lokacionin" /></SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((p) => (
                    <SelectItem key={`location-${p.id}`} value={p.id}>
                      {p.location} - {p.project_name}
                      {clientNameById[p.client_id || ''] ? ` - ${clientNameById[p.client_id || '']}` : ''}
                    </SelectItem>
                  ))}
                  {filteredLocations.length === 0 && (
                    <SelectItem value="__no_location__" disabled>Nuk ka lokacione aktive me kete kerkese</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.location && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Lokacioni automatik: {form.location}
                </p>
              )}
            </div>
            <div><Label>Data</Label><Input type="date" value={form.work_date} onChange={(e) => setForm((s) => ({ ...s, work_date: e.target.value }))} required /></div>
            <div><Label>Ore pune</Label><Input type="number" step="0.5" value={form.hours_worked} onChange={(e) => setForm((s) => ({ ...s, hours_worked: e.target.value }))} required /></div>
            <div>
              <Label>Paga/ore (opsionale - override per te gjithe)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.hourly_rate_override}
                onChange={(e) => setForm((s) => ({ ...s, hourly_rate_override: e.target.value }))}
                placeholder="Nese lihet bosh, merret paga e secilit punetor"
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Duke ruajtur...' : `Ruaj evidencen (${selectedWorkerIds.length})`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payroll i ketij muaji</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payroll.map((p) => (
            <div key={p.worker_id} className="border rounded p-3 flex justify-between">
              <div>
                <p className="font-medium">{p.worker_name}</p>
                <p className="text-sm text-muted-foreground">Ore totale: {p.total_hours.toFixed(2)}</p>
              </div>
              <p className="font-semibold">{formatChf(p.total_salary)}</p>
            </div>
          ))}
          {payroll.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka evidence per kete muaj.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historiku i oreve</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className="border rounded p-3 flex justify-between">
              <div>
                <p className="font-medium">{log.location}</p>
                <p className="text-sm text-muted-foreground">{log.work_date} - {Number(log.hours_worked).toFixed(2)} ore</p>
              </div>
              <p className="font-semibold">{formatChf(Number(log.total_amount))}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkLogsPage;
