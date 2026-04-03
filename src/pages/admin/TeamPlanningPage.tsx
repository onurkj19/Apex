import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectApi, teamPlanApi, workerApi } from '@/lib/erp-api';
import type { TeamPlanAttachment, TeamPlanItem, Worker } from '@/lib/erp-types';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { Paperclip, Truck } from 'lucide-react';

const getWeekDays = (date = new Date()) => {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

type PendingFileRow = { localId: string; title: string; file: File | null };

const newPendingRow = (): PendingFileRow => ({
  localId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
  title: '',
  file: null,
});

const TeamPlanningPage = () => {
  const [plans, setPlans] = useState<TeamPlanItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string; location: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [planType, setPlanType] = useState<'daily' | 'weekly'>('daily');
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [trailerRequired, setTrailerRequired] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | TeamPlanItem['status']>('all');
  const [editingPlan, setEditingPlan] = useState<TeamPlanItem | null>(null);
  const [keepAttachments, setKeepAttachments] = useState<TeamPlanAttachment[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingFileRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [planRows, workerRows, projectRows] = await Promise.all([teamPlanApi.list(), workerApi.list(), projectApi.list()]);
      setPlans(planRows);
      setWorkers(workerRows.filter((w) => w.is_active));
      setProjects(
        (projectRows || []).map((p: { id: string; project_name: string; location: string }) => ({
          id: p.id,
          project_name: p.project_name,
          location: p.location,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetFormFields = () => {
    setTitle('');
    setPlanType('daily');
    setPlanDate(new Date().toISOString().slice(0, 10));
    setLocation('');
    setTaskDetails('');
    setNotes('');
    setProjectId('');
    setVehicleLabel('');
    setTrailerRequired(false);
    setSelectedWorkers([]);
    setEditingPlan(null);
    setKeepAttachments([]);
    setPendingRows([]);
  };

  const startEdit = (plan: TeamPlanItem) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setPlanType(plan.plan_type);
    setPlanDate(plan.plan_date);
    setLocation(plan.location || '');
    setTaskDetails(plan.task_details || '');
    setNotes(plan.notes || '');
    setProjectId(plan.project_id || '');
    setVehicleLabel(plan.vehicle_label || '');
    setTrailerRequired(Boolean(plan.trailer_required));
    setSelectedWorkers([...(plan.worker_ids || [])]);
    setKeepAttachments(plan.attachments ? [...plan.attachments] : []);
    setPendingRows([]);
    document.getElementById('team-plan-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const uploads = pendingRows.filter((r) => r.file && r.title.trim());
    for (const r of pendingRows) {
      if (r.file && !r.title.trim()) {
        alert('Cakto titullin për çdo skedar të ri.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const basePayload = {
        title,
        plan_type: planType,
        plan_date: planDate,
        location: location || null,
        task_details: taskDetails || null,
        notes: notes || null,
        project_id: projectId || null,
        vehicle_label: vehicleLabel || null,
        trailer_required: trailerRequired,
        worker_ids: selectedWorkers,
      };

      if (editingPlan) {
        let merged: TeamPlanAttachment[] = [...keepAttachments];
        for (const u of uploads) {
          merged.push(await teamPlanApi.uploadAttachment(editingPlan.id, u.file!, u.title.trim()));
        }
        await teamPlanApi.update(editingPlan.id, {
          ...basePayload,
          attachments: merged,
        });
      } else {
        const plan = await teamPlanApi.create({
          ...basePayload,
          status: 'planned',
        });
        let atts: TeamPlanAttachment[] = [];
        for (const u of uploads) {
          atts.push(await teamPlanApi.uploadAttachment(plan.id, u.file!, u.title.trim()));
        }
        if (atts.length) {
          await teamPlanApi.update(plan.id, { attachments: atts });
        }
      }
      await load();
      resetFormFields();
    } finally {
      setSubmitting(false);
    }
  };

  const weekDays = useMemo(() => getWeekDays(new Date(planDate)), [planDate]);

  const weekPlans = useMemo(
    () =>
      plans.filter((p) => {
        const withinWeek = weekDays.some((d) => d.toISOString().slice(0, 10) === p.plan_date);
        if (!withinWeek) return false;
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
      }),
    [plans, weekDays, statusFilter],
  );

  const onWorkerDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const workerId = event.dataTransfer.getData('text/worker-id');
    if (!workerId) return;
    setSelectedWorkers((prev) => (prev.includes(workerId) ? prev : [...prev, workerId]));
  };

  const onPlanDropToDay = async (event: DragEvent<HTMLDivElement>, date: string) => {
    event.preventDefault();
    const planId = event.dataTransfer.getData('text/plan-id');
    if (!planId) return;
    await teamPlanApi.update(planId, { plan_date: date });
    await load();
  };

  const removeWorker = (workerId: string) => {
    setSelectedWorkers((prev) => prev.filter((id) => id !== workerId));
  };

  const attachmentCount = (p: TeamPlanItem) =>
    (p.attachments?.length || 0) + (p.attachment_path ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Calendar + Planning i ekipeve</h2>
        <Button onClick={load} variant="outline">
          Refresh
        </Button>
      </div>

      <Card id="team-plan-form">
        <CardHeader>
          <CardTitle>{editingPlan ? 'Ndrysho planin' : 'Krijo plan ditor/javor'}</CardTitle>
          {editingPlan && (
            <p className="text-sm text-muted-foreground">
              Po editon: {editingPlan.title}{' '}
              <Button type="button" variant="link" className="h-auto p-0" onClick={resetFormFields}>
                Anulo editimin
              </Button>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulli planit" required />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'daily' | 'weekly')}
            >
              <option value="daily">Ditor</option>
              <option value="weekly">Javor</option>
            </select>
            <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} required />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={projectId}
              onChange={(e) => {
                const newId = e.target.value;
                setProjectId(newId);
                const selectedProject = projects.find((p) => p.id === newId);
                if (selectedProject?.location && !location) setLocation(selectedProject.location);
              }}
            >
              <option value="">Pa projekt</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokacioni" />
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={vehicleLabel}
                onChange={(e) => setVehicleLabel(e.target.value)}
                placeholder="Furgoni / mjeti (p.sh. Mercedes 1)"
                className="flex-1"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={trailerRequired} onChange={(e) => setTrailerRequired(e.target.checked)} />
              Kërkohet rimorkio
            </label>
            <Input
              className="md:col-span-2"
              value={taskDetails}
              onChange={(e) => setTaskDetails(e.target.value)}
              placeholder="Detyrat kryesore (për punëtorin)"
            />
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Shënime shtesë për ekipin (opsionale)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informacione të tjera nga admini" />
            </div>
            <div
              className="md:col-span-2 border rounded-md p-3 bg-muted/20 min-h-24"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onWorkerDrop}
            >
              <p className="text-sm font-medium">Punëtorët e zgjedhur (drag & drop)</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedWorkers.length === 0 && (
                  <p className="text-xs text-muted-foreground">Tërhiq punëtorët nga lista poshtë.</p>
                )}
                {selectedWorkers.map((id) => {
                  const worker = workers.find((w) => w.id === id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => removeWorker(id)}
                      className="rounded-full border px-2 py-1 text-xs hover:bg-muted"
                      title="Hiq punëtorin"
                    >
                      {worker?.full_name || id} ×
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3 rounded-md border p-3 bg-muted/10">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <Label className="font-medium">Foto & dokumente (PDF) me titull</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Shto titull për çdo skedar. Punëtorët i shohin në dashboard me titull.
              </p>

              {editingPlan && keepAttachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Skedarë ekzistues</p>
                  <ul className="flex flex-wrap gap-2">
                    {keepAttachments.map((a) => (
                      <li
                        key={a.path}
                        className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs"
                      >
                        <span className="truncate max-w-[180px]">{a.title}</span>
                        <button
                          type="button"
                          className="text-destructive hover:underline"
                          onClick={() => setKeepAttachments((prev) => prev.filter((x) => x.path !== a.path))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pendingRows.map((row) => (
                <div key={row.localId} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Input
                    placeholder="Titulli (p.sh. Harta e kantierit)"
                    value={row.title}
                    onChange={(e) =>
                      setPendingRows((prev) =>
                        prev.map((r) => (r.localId === row.localId ? { ...r, title: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="cursor-pointer text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setPendingRows((prev) =>
                        prev.map((r) => (r.localId === row.localId ? { ...r, file: f } : r)),
                      );
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRows((prev) => prev.filter((r) => r.localId !== row.localId))}
                  >
                    Hiq
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPendingRows((prev) => [...prev, newPendingRow()])}
              >
                + Shto skedar
              </Button>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Duke ruajtur...' : editingPlan ? 'Përditëso planin' : 'Ruaj planin'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista e punëtorëve (drag)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {workers.map((worker) => (
            <div
              key={worker.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/worker-id', worker.id)}
              className="border rounded px-3 py-2 text-sm cursor-grab active:cursor-grabbing bg-background"
            >
              {worker.full_name} ({worker.group_name})
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalendari javor (drag planin në ditë tjetër)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtro status:</span>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TeamPlanItem['status'])}
            >
              <option value="all">Të gjitha</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayPlans = weekPlans.filter((p) => p.plan_date === dayKey);
              return (
                <div
                  key={dayKey}
                  className="border rounded-md p-2 min-h-40 bg-muted/10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void onPlanDropToDay(e, dayKey)}
                >
                  <p className="text-sm font-medium mb-2">
                    {day.toLocaleDateString('sq-AL', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </p>
                  <div className="space-y-2">
                    {dayPlans.map((plan) => (
                      <div
                        key={plan.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plan-id', plan.id)}
                        className="rounded-md border bg-background p-2 text-xs space-y-1 cursor-grab"
                      >
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-muted-foreground">{plan.location || 'Pa lokacion'}</p>
                        {plan.vehicle_label && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3 inline" /> {plan.vehicle_label}
                          </p>
                        )}
                        {plan.trailer_required && <p className="text-amber-600">Rimorkio: po</p>}
                        {attachmentCount(plan) > 0 && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3" /> {attachmentCount(plan)} skedar(ë)
                          </p>
                        )}
                        <p className="text-muted-foreground">{(plan.worker_ids || []).length} punëtor</p>
                        <div className="flex justify-end">
                          <RowActionsMenu
                            actions={[
                              {
                                label: 'Ndrysho',
                                onClick: () => startEdit(plan),
                              },
                              {
                                label: 'Në progres',
                                onClick: () => void teamPlanApi.update(plan.id, { status: 'in_progress' }).then(load),
                              },
                              {
                                label: 'Done',
                                onClick: () => void teamPlanApi.update(plan.id, { status: 'done' }).then(load),
                              },
                              {
                                label: 'Fshi',
                                destructive: true,
                                onClick: () => {
                                  if (!window.confirm('A je i sigurt që do ta fshish planin?')) return;
                                  void teamPlanApi.remove(plan.id).then(load);
                                },
                              },
                            ]}
                          />
                        </div>
                      </div>
                    ))}
                    {dayPlans.length === 0 && <p className="text-xs text-muted-foreground">Nuk ka plane.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar planifikimin...</p>}
    </div>
  );
};

export default TeamPlanningPage;
