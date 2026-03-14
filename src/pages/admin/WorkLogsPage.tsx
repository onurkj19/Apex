import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { projectApi, workLogApi, workerApi } from '@/lib/erp-api';

const WorkLogsPage = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [form, setForm] = useState({
    worker_id: '',
    project_id: '',
    location: '',
    work_date: '',
    hours_worked: '',
    hourly_rate: '',
  });

  const load = async () => {
    const [workersRes, projectsRes, logsRes, payrollRes] = await Promise.all([
      workerApi.list(),
      projectApi.list(),
      workLogApi.list(),
      workLogApi.getPayrollByMonth(),
    ]);
    setWorkers(workersRes);
    setProjects(projectsRes);
    setLogs(logsRes);
    setPayroll(payrollRes);
  };

  useEffect(() => {
    load();
  }, []);

  const onWorkerChange = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    setForm((prev) => ({
      ...prev,
      worker_id: workerId,
      hourly_rate: worker ? String(worker.hourly_rate) : prev.hourly_rate,
    }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await workLogApi.create({
      worker_id: form.worker_id,
      project_id: form.project_id,
      location: form.location,
      work_date: form.work_date,
      hours_worked: Number(form.hours_worked),
      hourly_rate: Number(form.hourly_rate),
    });
    setForm({
      worker_id: '',
      project_id: '',
      location: '',
      work_date: '',
      hours_worked: '',
      hourly_rate: '',
    });
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Evidenca e oreve te punes</h2>

      <Card>
        <CardHeader><CardTitle>Shto ore pune</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Punetori</Label>
              <Select value={form.worker_id} onValueChange={onWorkerChange}>
                <SelectTrigger><SelectValue placeholder="Zgjidh punetorin" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projekti</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm((s) => ({ ...s, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh projektin" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Lokacioni</Label><Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} required /></div>
            <div><Label>Data</Label><Input type="date" value={form.work_date} onChange={(e) => setForm((s) => ({ ...s, work_date: e.target.value }))} required /></div>
            <div><Label>Ore pune</Label><Input type="number" step="0.5" value={form.hours_worked} onChange={(e) => setForm((s) => ({ ...s, hours_worked: e.target.value }))} required /></div>
            <div><Label>Paga/ore</Label><Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm((s) => ({ ...s, hourly_rate: e.target.value }))} required /></div>
            <div className="md:col-span-3"><Button type="submit">Ruaj evidencen</Button></div>
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
              <p className="font-semibold">{p.total_salary.toFixed(2)} CHF</p>
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
              <p className="font-semibold">{Number(log.total_amount).toFixed(2)} CHF</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkLogsPage;
