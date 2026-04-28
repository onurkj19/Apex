import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workerApi, workerGroupApi } from '@/lib/erp-api';
import type { Worker, WorkerGroup } from '@/lib/erp-types';
import { WORKER_ROLE_OPTIONS } from '@/lib/worker-role-options';
import { formatNumberWithDots } from '@/lib/utils';

const SortableWorker = ({ worker }: { worker: Worker }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: worker.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="border rounded-md p-2 bg-background cursor-grab"
      {...attributes}
      {...listeners}
    >
      <p className="font-medium">{worker.full_name}</p>
      <p className="text-xs text-muted-foreground">{worker.role} - {formatNumberWithDots(worker.hourly_rate)} CHF/h</p>
    </div>
  );
};

const GroupColumn = ({ name, workers }: { name: string; workers: Worker[] }) => {
  const { setNodeRef } = useDroppable({ id: name });
  return (
    <Card>
      <CardHeader><CardTitle>{name}</CardTitle></CardHeader>
      <CardContent ref={setNodeRef} className="space-y-2 min-h-40">
        <SortableContext items={workers.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          {workers.map((worker) => <SortableWorker key={worker.id} worker={worker} />)}
        </SortableContext>
      </CardContent>
    </Card>
  );
};

const WorkersPage = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [groups, setGroups] = useState<WorkerGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    hourly_rate: '',
    role: WORKER_ROLE_OPTIONS[0].value,
    group_name: '',
  });

  const load = async () => {
    const [workerRows, groupRows] = await Promise.all([workerApi.list(), workerGroupApi.list()]);
    setWorkers(workerRows);
    setGroups(groupRows);
    const firstActive = groupRows.find((g) => g.is_active)?.name || '';
    setForm((prev) => ({ ...prev, group_name: prev.group_name || firstActive }));
  };
  useEffect(() => { load(); }, []);

  const byGroup = useMemo(
    () => groups.reduce<Record<string, Worker[]>>((acc, group) => {
      acc[group.name] = workers.filter((w) => w.group_name === group.name);
      return acc;
    }, {}),
    [workers, groups],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      alert('Te lutem zgjedh rolin e punetorit.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta ruash punetorin?')) return;
    setIsSubmitting(true);
    try {
      await workerApi.create({
        full_name: form.full_name,
        hourly_rate: Number(form.hourly_rate),
        role: form.role,
        group_name: form.group_name,
      });
      const firstActive = groups.find((g) => g.is_active)?.name || '';
      setForm({
        full_name: '',
        hourly_rate: '',
        role: WORKER_ROLE_OPTIONS[0].value,
        group_name: firstActive,
      });
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const workerId = event.active.id as string;
    const targetGroup = event.over?.id as string | undefined;
    if (!targetGroup || !groups.some((g) => g.name === targetGroup && g.is_active)) return;
    await workerApi.moveGroup(workerId, targetGroup);
    await load();
  };

  const deleteWorker = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete punetor?')) return;
    setActionLoadingId(`delete-worker-${id}`);
    try {
      await workerApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const saveWorkerEdit = async (worker: Worker) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin e punetorit?')) return;
    setActionLoadingId(`edit-worker-${worker.id}`);
    try {
      await workerApi.update(worker.id, {
        full_name: worker.full_name,
        role: worker.role,
        hourly_rate: worker.hourly_rate,
        group_name: worker.group_name,
      });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const addGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    if (!confirm('A je i sigurt qe do ta krijosh grupin e ri?')) return;
    setActionLoadingId('add-group');
    try {
      await workerGroupApi.create(groupName.trim());
      setGroupName('');
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleGroup = async (group: WorkerGroup) => {
    if (!confirm(`A je i sigurt qe do ta ${group.is_active ? 'caktivizosh' : 'aktivizosh'} grupin?`)) return;
    setActionLoadingId(`toggle-group-${group.id}`);
    try {
      await workerGroupApi.setActive(group.id, !group.is_active);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteGroup = async (group: WorkerGroup) => {
    const workersInGroup = workers.filter((w) => w.group_name === group.name).length;
    if (workersInGroup > 0) {
      alert('Nuk mund ta fshish grupin sepse ka punetore brenda tij.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta fshish kete grup?')) return;
    setActionLoadingId(`delete-group-${group.id}`);
    try {
      await workerGroupApi.remove(group.id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleOptionsWithCurrent = (currentRole?: string) => {
    if (!currentRole) return WORKER_ROLE_OPTIONS;
    const exists = WORKER_ROLE_OPTIONS.some((opt) => opt.value === currentRole);
    if (exists) return WORKER_ROLE_OPTIONS;
    return [
      { value: currentRole, label: `${currentRole} (Ekzistues)`, keywords: 'Rol i ruajtur me pare' },
      ...WORKER_ROLE_OPTIONS,
    ];
  };

  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Menaxhimi i punetoreve</h2>
        <div className="flex gap-2">
          <Button variant={showAddWorker ? 'default' : 'outline'} onClick={() => { setShowAddWorker(v => !v); setShowAddGroup(false); }} className="gap-2">
            + Shto Punetor
          </Button>
          <Button variant={showAddGroup ? 'default' : 'outline'} onClick={() => { setShowAddGroup(v => !v); setShowAddWorker(false); }} className="gap-2">
            + Shto Grup
          </Button>
        </div>
      </div>

      {/* Forma Shto Punetor */}
      {showAddWorker && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle>Shto punetor të ri</CardTitle></CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
              <div className="space-y-1.5"><Label>Emri i plotë</Label><Input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="p.sh. Arben Krasniqi" required /></div>
              <div className="space-y-1.5">
                <Label>Roli profesional</Label>
                <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh rolin" /></SelectTrigger>
                  <SelectContent>{WORKER_ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Paga / Orë (CHF)</Label><Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm((s) => ({ ...s, hourly_rate: e.target.value }))} placeholder="p.sh. 25" required /></div>
              <div className="space-y-1.5">
                <Label>Grupi</Label>
                <Select value={form.group_name} onValueChange={(v) => setForm((s) => ({ ...s, group_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh grupin" /></SelectTrigger>
                  <SelectContent>{groups.filter((g) => g.is_active).map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Duke ruajtur...' : 'Ruaj punetorin'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddWorker(false)}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Forma Shto Grup */}
      {showAddGroup && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle>Shto grup të ri</CardTitle></CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={addGroup}>
              <Input placeholder="Emri i grupit" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="max-w-xs" />
              <Button type="submit" disabled={actionLoadingId === 'add-group'}>{actionLoadingId === 'add-group' ? 'Duke shtuar...' : 'Shto'}</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddGroup(false)}>Anulo</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grupet aktive */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>Grupet</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-border/70 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{group.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${group.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {group.is_active ? 'Aktiv' : 'Jo aktiv'}
                </span>
                <span className="text-xs text-muted-foreground">({(byGroup[group.name] || []).length} punëtorë)</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!!actionLoadingId} onClick={() => toggleGroup(group)}>
                  {group.is_active ? 'Çaktivizo' : 'Aktivizo'}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={!!actionLoadingId} onClick={() => deleteGroup(group)}>
                  Fshi
                </Button>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka grupe.</p>}
        </CardContent>
      </Card>

      {/* Lista e punëtorëve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Punëtorët ({workers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workers.map((worker) => {
            const isExpanded = expandedWorkerId === worker.id;
            const isEditing = editingId === worker.id;
            return (
              <div key={worker.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => { if (isEditing) return; setExpandedWorkerId(prev => prev === worker.id ? null : worker.id); }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {worker.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium leading-snug">{worker.full_name}</p>
                      <p className="text-xs text-muted-foreground">{worker.role} · {worker.group_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums font-semibold text-sm">{formatNumberWithDots(worker.hourly_rate)} CHF/h</span>
                    <span className={`text-muted-foreground transition-transform duration-200 ${(isExpanded || isEditing) ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>
                {(isExpanded || isEditing) && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Emri</Label><Input value={worker.full_name} onChange={(e) => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, full_name: e.target.value } : w))} /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Roli</Label>
                          <Select value={worker.role} onValueChange={(v) => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, role: v } : w))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{getRoleOptionsWithCurrent(worker.role).map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Paga/Orë (CHF)</Label><Input type="number" step="0.01" value={worker.hourly_rate} onChange={(e) => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, hourly_rate: Number(e.target.value) } : w))} /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Grupi</Label>
                          <Select value={worker.group_name} onValueChange={(v) => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, group_name: v } : w))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{groups.filter(g => g.is_active).map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <Button size="sm" disabled={actionLoadingId === `edit-worker-${worker.id}`} onClick={() => saveWorkerEdit(worker)}>
                            {actionLoadingId === `edit-worker-${worker.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setExpandedWorkerId(worker.id); }}>Anulo</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(worker.id)}>Modifiko</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={actionLoadingId === `delete-worker-${worker.id}`} onClick={() => deleteWorker(worker.id)}>
                          {actionLoadingId === `delete-worker-${worker.id}` ? 'Duke fshirë...' : 'Fshi'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {workers.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka punëtorë.</p>}
        </CardContent>
      </Card>

      {/* Drag & Drop grupet */}
      <Card>
        <CardHeader className="pb-2"><CardTitle>Vendos punëtorët nëpër grupe (drag & drop)</CardTitle></CardHeader>
        <CardContent>
          <DndContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groups.filter((g) => g.is_active).map((g) => <GroupColumn key={g.id} name={g.name} workers={byGroup[g.name] || []} />)}
            </div>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkersPage;
