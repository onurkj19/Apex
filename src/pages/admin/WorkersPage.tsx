import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { workerApi } from '@/lib/erp-api';
import type { Worker } from '@/lib/erp-types';

const groups = ['Grupi A', 'Grupi B', 'Grupi C'];

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
      <p className="text-xs text-muted-foreground">{worker.role} - {worker.hourly_rate} CHF/h</p>
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
  const [form, setForm] = useState({ full_name: '', hourly_rate: '', role: '', group_name: groups[0] });

  const load = async () => setWorkers(await workerApi.list());
  useEffect(() => { load(); }, []);

  const byGroup = useMemo(
    () => groups.reduce<Record<string, Worker[]>>((acc, group) => {
      acc[group] = workers.filter((w) => w.group_name === group);
      return acc;
    }, {}),
    [workers],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await workerApi.create({
      full_name: form.full_name,
      hourly_rate: Number(form.hourly_rate),
      role: form.role,
      group_name: form.group_name,
    });
    setForm({ full_name: '', hourly_rate: '', role: '', group_name: groups[0] });
    await load();
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const workerId = event.active.id as string;
    const targetGroup = event.over?.id as string | undefined;
    if (!targetGroup || !groups.includes(targetGroup)) return;
    await workerApi.moveGroup(workerId, targetGroup);
    await load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menaxhimi i punetoreve</h2>
      <Card>
        <CardHeader><CardTitle>Shto punetor</CardTitle></CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={onSubmit}>
            <div><Label>Emri</Label><Input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} required /></div>
            <div><Label>Roli</Label><Input value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} required /></div>
            <div><Label>Paga/Ore</Label><Input type="number" value={form.hourly_rate} onChange={(e) => setForm((s) => ({ ...s, hourly_rate: e.target.value }))} required /></div>
            <div><Label>Grupi</Label><Input value={form.group_name} onChange={(e) => setForm((s) => ({ ...s, group_name: e.target.value }))} required /></div>
            <div className="md:col-span-4"><Button type="submit">Ruaj</Button></div>
          </form>
        </CardContent>
      </Card>

      <DndContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {groups.map((g) => <GroupColumn key={g} name={g} workers={byGroup[g] || []} />)}
        </div>
      </DndContext>
    </div>
  );
};

export default WorkersPage;
