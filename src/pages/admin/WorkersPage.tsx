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
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { workerApi, workerGroupApi } from '@/lib/erp-api';
import type { Worker, WorkerGroup } from '@/lib/erp-types';
import { formatNumberWithDots } from '@/lib/utils';

const WORKER_ROLE_OPTIONS = [
  { value: 'Monter Skele', label: 'Monter Skele', keywords: 'Montim, Demontim, Siguri' },
  { value: 'Punetor Ndihmes', label: 'Punetor Ndihmes', keywords: 'Ngarkim, Shkarkim, Asistence' },
  { value: 'Teknik Sigure', label: 'Teknik Sigure', keywords: 'Inspektim, PPE, Standarde' },
  { value: 'Shofer Transporti', label: 'Shofer Transporti', keywords: 'Logjistike, Dorzim, Mjete' },
  { value: 'Pergjegjes Ekipi', label: 'Pergjegjes Ekipi', keywords: 'Koordinim, Planifikim, Raportim' },
  { value: 'Supervisor Kantieri', label: 'Supervisor Kantieri', keywords: 'Mbikqyrje, Cilesi, Afate' },
  { value: 'Operator Makinerie', label: 'Operator Makinerie', keywords: 'Forklift, Vinç, Pajisje' },
  { value: 'Pergjegjes Magazina', label: 'Pergjegjes Magazina', keywords: 'Inventar, Evidenca, Furnizim' },
];

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menaxhimi i punetoreve</h2>

      <Card>
        <CardHeader><CardTitle>Menaxhimi i grupeve</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form className="flex gap-2" onSubmit={addGroup}>
            <Input placeholder="Emri i grupit te ri" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <Button type="submit" disabled={actionLoadingId === 'add-group'}>
              {actionLoadingId === 'add-group' ? 'Duke shtuar...' : 'Shto grup'}
            </Button>
          </form>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="border rounded p-2 flex items-center justify-between">
                <span>{group.name} {group.is_active ? '(Aktiv)' : '(Jo aktiv)'}</span>
                <div className="flex gap-2">
                  <RowActionsMenu
                    disabled={actionLoadingId === `toggle-group-${group.id}` || actionLoadingId === `delete-group-${group.id}`}
                    actions={[
                      {
                        label: actionLoadingId === `toggle-group-${group.id}`
                          ? 'Duke ruajtur...'
                          : (group.is_active ? 'Caktivizo' : 'Aktivizo'),
                        onClick: () => toggleGroup(group),
                        disabled: actionLoadingId === `toggle-group-${group.id}`,
                      },
                      {
                        label: actionLoadingId === `delete-group-${group.id}` ? 'Duke fshire...' : 'Fshi',
                        onClick: () => deleteGroup(group),
                        disabled: actionLoadingId === `delete-group-${group.id}`,
                        destructive: true,
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Shto punetor</CardTitle></CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={onSubmit}>
            <div><Label>Emri</Label><Input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} required /></div>
            <div>
              <Label>Roli profesional</Label>
              <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh rolin" /></SelectTrigger>
                <SelectContent>
                  {WORKER_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label} - {role.keywords}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Paga/Ore</Label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm((s) => ({ ...s, hourly_rate: e.target.value }))} required /></div>
            <div>
              <Label>Grupi</Label>
              <Select value={form.group_name} onValueChange={(v) => setForm((s) => ({ ...s, group_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Zgjidh grupin" /></SelectTrigger>
                <SelectContent>
                  {groups.filter((g) => g.is_active).map((g) => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DndContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {groups.filter((g) => g.is_active).map((g) => <GroupColumn key={g.id} name={g.name} workers={byGroup[g.name] || []} />)}
        </div>
      </DndContext>

      <Card>
        <CardHeader><CardTitle>Edito / Fshi punetore</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {workers.map((worker) => (
            <div key={worker.id} className="border rounded p-3">
              {editingId === worker.id ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input value={worker.full_name} onChange={(e) => setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, full_name: e.target.value } : w))} />
                  <Select value={worker.role} onValueChange={(v) => setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, role: v } : w))}>
                    <SelectTrigger><SelectValue placeholder="Zgjidh rolin" /></SelectTrigger>
                    <SelectContent>
                      {getRoleOptionsWithCurrent(worker.role).map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label} - {role.keywords}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={worker.hourly_rate} onChange={(e) => setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, hourly_rate: Number(e.target.value) } : w))} />
                  <Select value={worker.group_name} onValueChange={(v) => setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, group_name: v } : w))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {groups.filter((g) => g.is_active).map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={actionLoadingId === `edit-worker-${worker.id}`} onClick={() => saveWorkerEdit(worker)}>
                      {actionLoadingId === `edit-worker-${worker.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={actionLoadingId === `edit-worker-${worker.id}`} onClick={() => setEditingId(null)}>Anulo</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{worker.full_name}</p>
                    <p className="text-sm text-muted-foreground">{worker.role} | {formatNumberWithDots(worker.hourly_rate)} CHF/h | {worker.group_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <RowActionsMenu
                      disabled={actionLoadingId === `delete-worker-${worker.id}`}
                      actions={[
                        { label: 'Edito', onClick: () => setEditingId(worker.id) },
                        {
                          label: actionLoadingId === `delete-worker-${worker.id}` ? 'Duke fshire...' : 'Fshi',
                          onClick: () => deleteWorker(worker.id),
                          disabled: actionLoadingId === `delete-worker-${worker.id}`,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkersPage;
