import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { hoursApi, payrollApi, unterakkordApi, type AssignmentRow, type TimeEntryRow } from '@/lib/v2/api';
import { hoursFromMinutes } from '@/lib/v2/decimal';
import { calculateWorkedMinutes, formatDateDe, todayInZurich } from '@/lib/v2/time';
import { Empty, Field, PageHeader, StatusBadge, Tag, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { weekdayDe } from '@/lib/v2/pdf/models';

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) : '');
const rateText = (r: string | number | null) => (r === null ? '–' : Number(r).toFixed(2));

const HoursApprovalPage = () => {
  const [status, setStatus] = useState('submitted');
  const [assignmentId, setAssignmentId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<TimeEntryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([]);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState<TimeEntryRow | null>(null);
  const [adj, setAdj] = useState({ approved: '', billable: '', rate: '', reason: '' });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ workerId: '', date: todayInZurich(), start: '07:00', end: '16:00', breakMinutes: '60', targetKey: '', worksite: '', description: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await hoursApi.list({ status, assignmentId: assignmentId || undefined, workerId: workerId || undefined, from: from || undefined, to: to || undefined }));
      setSelected(new Set());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [status, assignmentId, workerId, from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    unterakkordApi.assignments().then(setAssignments).catch(() => undefined);
    payrollApi.workers().then((w) => setWorkers(w.filter((x) => x.is_active))).catch(() => undefined);
  }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === 'submitted'), [rows]);
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const approve = async (ids: string[]) => {
    try {
      const n = await hoursApi.approve(ids);
      toast.success(`${n} Einträge genehmigt.`);
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const reject = async (ids: string[]) => {
    const reason = window.prompt('Ablehnungsgrund (Pflicht):');
    if (!reason) return;
    try {
      await hoursApi.reject(ids, reason);
      toast.success('Abgelehnt.');
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const openAdjust = (r: TimeEntryRow) => {
    setAdjusting(r);
    setAdj({ approved: String(r.approved_minutes ?? r.worked_minutes ?? 0), billable: String(r.billable_minutes ?? r.approved_minutes ?? r.worked_minutes ?? 0), rate: r.billing_rate === null ? '' : String(r.billing_rate), reason: '' });
  };

  const saveAdjust = async () => {
    if (!adjusting) return;
    try {
      await hoursApi.adjust({ id: adjusting.id, approved: Number(adj.approved), billable: Number(adj.billable), rate: adj.rate === '' ? null : adj.rate, reason: adj.reason });
      setAdjusting(null);
      toast.success('Korrektur gespeichert.');
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const createEntry = async () => {
    const target = assignments.find((a) => `assignment:${a.id}` === form.targetKey);
    const check = calculateWorkedMinutes({ start: form.start, end: form.end, breakMinutes: Number(form.breakMinutes) });
    if (check.ok === false) return setError(check.error);
    if (!form.workerId || !target) return setError('Mitarbeiter und Auftrag wählen.');
    try {
      await hoursApi.adminCreate({ workerId: form.workerId, date: form.date, start: form.start, end: form.end, breakMinutes: Number(form.breakMinutes), target: { kind: 'assignment', id: target.id, label: target.assignment_number }, worksite: form.worksite || target.worksite_address, description: form.description });
      setCreating(false);
      toast.success('Eintrag erstellt (eingereicht, noch nicht genehmigt).');
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const totals = rows.reduce((a, r) => ({ worked: a.worked + (r.worked_minutes ?? 0), approved: a.approved + (r.approved_minutes ?? (r.status === 'approved' ? r.worked_minutes ?? 0 : 0)) }), { worked: 0, approved: 0 });

  return (
    <div className="space-y-5">
      <PageHeader title="Stunden genehmigen" description="Erfasste, genehmigte und verrechenbare Stunden sind getrennt. Der Verrechnungssatz wird bei der Genehmigung festgeschrieben."
        actions={<Button onClick={() => setCreating(true)}>Eintrag für Mitarbeiter erfassen</Button>} />
      <Card><CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-5">
        <Field label="Status">
          <select className={nativeFieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="submitted">Eingereicht</option><option value="approved">Genehmigt</option><option value="rejected">Abgelehnt</option><option value="all">Alle</option>
          </select>
        </Field>
        <Field label="Auftrag">
          <select className={nativeFieldClass} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
            <option value="">Alle</option>{assignments.map((a) => <option key={a.id} value={a.id}>{a.clients?.company_name} · {a.assignment_number}</option>)}
          </select>
        </Field>
        <Field label="Mitarbeiter">
          <select className={nativeFieldClass} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
            <option value="">Alle</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
          </select>
        </Field>
        <Field label="Von"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Bis"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </CardContent></Card>

      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={selected.size === 0} onClick={() => void approve([...selected])}>Auswahl genehmigen ({selected.size})</Button>
        <Button size="sm" variant="destructive" disabled={selected.size === 0} onClick={() => void reject([...selected])}>Auswahl ablehnen</Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set(pending.map((r) => r.id)))}>Alle offenen wählen</Button>
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} Einträge · erfasst {hoursFromMinutes(totals.worked)} h · genehmigt {hoursFromMinutes(totals.approved)} h</span>
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        {rows.length === 0 ? <Empty>Keine Einträge für diesen Filter.</Empty> : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="p-3" /><th className="p-3">Datum</th><th className="p-3">Mitarbeiter</th><th className="p-3">Auftrag / Projekt</th><th className="p-3">Zeit</th><th className="p-3 text-right">Erfasst</th><th className="p-3 text-right">Genehmigt</th><th className="p-3 text-right">Verrechenbar</th><th className="p-3 text-right">Satz</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 align-top">
                  <td className="p-3">{r.status === 'submitted' && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}</td>
                  <td className="whitespace-nowrap p-3">{weekdayDe(r.work_date)} {formatDateDe(r.work_date)} {r.is_saturday && <Tag tone="info">Sa</Tag>}</td>
                  <td className="p-3">{r.workers?.full_name}</td>
                  <td className="p-3">{r.subcontract_assignments?.assignment_number ?? r.projects?.project_name}<span className="block text-xs text-muted-foreground">{r.worksite}</span></td>
                  <td className="whitespace-nowrap p-3">{clock(r.start_at)}–{clock(r.end_at)}<span className="block text-xs text-muted-foreground">Pause {r.break_minutes} Min. · {r.source}</span></td>
                  <td className="p-3 text-right tabular-nums">{hoursFromMinutes(r.worked_minutes ?? 0)}</td>
                  <td className="p-3 text-right tabular-nums">{r.approved_minutes === null ? '–' : hoursFromMinutes(r.approved_minutes)}</td>
                  <td className="p-3 text-right tabular-nums">{r.billable_minutes === null ? '–' : hoursFromMinutes(r.billable_minutes)}</td>
                  <td className="p-3 text-right tabular-nums">{r.assignment_id ? rateText(r.billing_rate) : ''}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {r.status === 'submitted' && <><Button size="sm" variant="ghost" onClick={() => void approve([r.id])}>OK</Button><Button size="sm" variant="ghost" onClick={() => void reject([r.id])}>Ablehnen</Button></>}
                    {r.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => openAdjust(r)}>Korrigieren</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Genehmigte Stunden korrigieren</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Genehmigte Minuten"><Input inputMode="numeric" value={adj.approved} onChange={(e) => setAdj({ ...adj, approved: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Verrechenbare Minuten"><Input inputMode="numeric" value={adj.billable} onChange={(e) => setAdj({ ...adj, billable: e.target.value.replace(/\D/g, '') })} /></Field>
            {adjusting?.assignment_id && <Field label="Verrechnungssatz CHF/h"><Input inputMode="decimal" value={adj.rate} onChange={(e) => setAdj({ ...adj, rate: e.target.value })} /></Field>}
            <div className="col-span-2"><Field label="Begründung (Pflicht)"><Input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjusting(null)}>Abbrechen</Button><Button onClick={() => void saveAdjust()}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stunden für Mitarbeiter erfassen</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mitarbeiter"><select className={nativeFieldClass} value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}><option value="">Wählen …</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select></Field>
            <Field label="Auftrag"><select className={nativeFieldClass} value={form.targetKey} onChange={(e) => setForm({ ...form, targetKey: e.target.value })}><option value="">Wählen …</option>{assignments.map((a) => <option key={a.id} value={`assignment:${a.id}`}>{a.assignment_number} · {a.clients?.company_name}</option>)}</select></Field>
            <Field label="Datum"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Pause (Min.)"><Input inputMode="numeric" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Beginn"><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="Ende"><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Baustelle"><Input value={form.worksite} onChange={(e) => setForm({ ...form, worksite: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Beschreibung"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreating(false)}>Abbrechen</Button><Button onClick={() => void createEntry()}>Erstellen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HoursApprovalPage;
