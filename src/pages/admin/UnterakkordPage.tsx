import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { payrollApi, unterakkordApi, type AssignmentRow, type ClientRow } from '@/lib/v2/api';
import { formatChf, parseDecimal } from '@/lib/v2/decimal';
import { formatDateDe, todayInZurich } from '@/lib/v2/time';
import { Empty, Field, PageHeader, StatusBadge, Tag, errorMessage, nativeFieldClass } from '@/components/v2/ui';

const BILLING: Record<string, string> = { open: 'Offen', ready_to_bill: 'Bereit zur Verrechnung', invoiced: 'Verrechnet', paid: 'Bezahlt', disputed: 'Strittig' };
const STATUS: Record<string, string> = { planned: 'Geplant', active: 'Aktiv', completed: 'Abgeschlossen', cancelled: 'Storniert' };
const EXPENSE: Record<string, string> = { transport: 'Transport', material: 'Material', accommodation: 'Unterkunft', other: 'Andere' };
const money = (v: string | number | null | undefined) => (v === null || v === undefined ? '–' : formatChf(parseDecimal(v)));

type Form = Partial<AssignmentRow> & { assignment_number: string; client_id: string; worksite_address: string; start_date: string; hourly: string; saturday: string; billing_status: string; invoice_reference: string };
const emptyForm = (): Form => ({ assignment_number: '', client_id: '', worksite_address: '', start_date: todayInZurich(), status: 'planned', hourly: '', saturday: '', billing_status: 'open', invoice_reference: '' });

const UnterakkordPage = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string; is_active: boolean }[]>([]);
  const [expenses, setExpenses] = useState<Awaited<ReturnType<typeof unterakkordApi.expenses>>>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [addWorker, setAddWorker] = useState('');
  const [exp, setExp] = useState({ assignment_id: '', expense_date: todayInZurich(), category: 'transport', amount: '', description: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, a, w, e] = await Promise.all([unterakkordApi.clients(), unterakkordApi.assignments(), payrollApi.workers(), unterakkordApi.expenses()]);
      setClients(c); setAssignments(a); setWorkers(w.filter((x) => x.is_active)); setExpenses(e);
    } catch (err) { setError(errorMessage(err)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const edit = (a: AssignmentRow) => setForm({ ...a, hourly: a.assignment_billing?.hourly_rate == null ? '' : String(a.assignment_billing.hourly_rate), saturday: a.assignment_billing?.saturday_rate == null ? '' : String(a.assignment_billing.saturday_rate), billing_status: a.assignment_billing?.billing_status ?? 'open', invoice_reference: a.assignment_billing?.invoice_reference ?? '' });

  const save = async () => {
    if (!form) return;
    setError('');
    try {
      const id = await unterakkordApi.saveAssignment(form);
      await unterakkordApi.saveBilling(id, { hourly_rate: form.hourly, saturday_rate: form.saturday, billing_status: form.billing_status, invoice_reference: form.invoice_reference });
      toast.success(form.id ? 'Auftrag gespeichert.' : 'Auftrag erstellt. Jetzt Mitarbeiter zuteilen.');
      await load();
      if (!form.id) setForm({ ...form, id });
    } catch (e) { setError(errorMessage(e)); }
  };

  const current = form?.id ? assignments.find((a) => a.id === form.id) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="Unterakkord" description="Aufträge externer Firmen mit Auftragsnummer, Baustelle, Team, Verrechnungssatz (Standard CHF 46.00/h inkl. Samstag) und Spesen." actions={<Button onClick={() => setForm(emptyForm())}>Neuer Auftrag</Button>} />
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <Tabs defaultValue="assignments">
        <TabsList><TabsTrigger value="assignments">Aufträge</TabsTrigger><TabsTrigger value="clients">Kunden &amp; Sätze</TabsTrigger><TabsTrigger value="expenses">Spesen</TabsTrigger></TabsList>

        <TabsContent value="assignments" className="space-y-3">
          {assignments.length === 0 && <Card><CardContent><Empty>Noch keine Aufträge.</Empty></CardContent></Card>}
          {assignments.map((a) => (
            <Card key={a.id}><CardContent className="space-y-2 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{a.clients?.company_name} · {a.assignment_number} {a.title && <span className="font-normal text-muted-foreground">– {a.title}</span>}</p>
                <span className="flex gap-2"><StatusBadge status={a.status} label={STATUS[a.status]} /><Tag>{BILLING[a.assignment_billing?.billing_status ?? 'open']}</Tag></span>
              </div>
              <p className="text-sm text-muted-foreground">{a.worksite_address} · {formatDateDe(a.start_date)}{a.end_date ? ` – ${formatDateDe(a.end_date)}` : ' – offen'} · Satz {a.assignment_billing?.hourly_rate != null ? `CHF ${money(a.assignment_billing.hourly_rate)}` : 'Standard/Kunde'}</p>
              <p className="text-xs text-muted-foreground">Team: {(a.assignment_workers ?? []).map((w) => w.workers?.full_name).filter(Boolean).join(', ') || 'noch niemand zugeteilt'}{a.team_leader_worker_id ? ` · Vorarbeiter: ${workers.find((w) => w.id === a.team_leader_worker_id)?.full_name ?? '–'}` : ''}</p>
              <Button size="sm" variant="outline" onClick={() => edit(a)}>Bearbeiten</Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="clients">
          <Card><CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="p-3">Kunde</th><th className="p-3">Unterakkord</th><th className="p-3 text-right">Satz CHF/h</th><th className="p-3 text-right">Samstag CHF/h</th><th className="p-3" /></tr></thead>
              <tbody>{clients.map((c) => <ClientRowEditor key={c.id} client={c} onSaved={load} onError={setError} />)}</tbody>
            </table>
            <p className="p-3 text-xs text-muted-foreground">Rangfolge des Verrechnungssatzes: Auftrag → Kunde → Standard (CHF 46.00). Der Samstagssatz fällt auf den Werktagssatz zurück, wenn nicht gesetzt.</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-3">
          <Card><CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-5">
            <Field label="Auftrag"><select className={nativeFieldClass} value={exp.assignment_id} onChange={(e) => setExp({ ...exp, assignment_id: e.target.value })}><option value="">Wählen …</option>{assignments.map((a) => <option key={a.id} value={a.id}>{a.assignment_number}</option>)}</select></Field>
            <Field label="Datum"><Input type="date" value={exp.expense_date} onChange={(e) => setExp({ ...exp, expense_date: e.target.value })} /></Field>
            <Field label="Kategorie"><select className={nativeFieldClass} value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>{Object.entries(EXPENSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Betrag CHF"><Input inputMode="decimal" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></Field>
            <Field label="Beschreibung"><Input value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} /></Field>
            <div className="col-span-full"><Button size="sm" onClick={async () => { try { await unterakkordApi.addExpense(exp); setExp({ ...exp, amount: '', description: '' }); toast.success('Spesen erfasst.'); await load(); } catch (e) { setError(errorMessage(e)); } }}>Spesen hinzufügen</Button></div>
          </CardContent></Card>
          <Card><CardContent className="space-y-1 pt-4 text-sm">
            {expenses.length === 0 && <Empty>Keine Spesen.</Empty>}
            {expenses.map((x) => (
              <div key={x.id} className="flex items-center justify-between border-b border-border/40 py-1">
                <span>{formatDateDe(x.expense_date)} · {x.subcontract_assignments?.assignment_number} · {EXPENSE[x.category]} {x.description && `· ${x.description}`}</span>
                <span className="flex items-center gap-2"><span className="tabular-nums">CHF {money(x.amount)}</span><Button size="sm" variant="ghost" onClick={async () => { if (window.confirm('Spesen löschen?')) { try { await unterakkordApi.deleteExpense(x.id); await load(); } catch (e) { setError(errorMessage(e)); } } }}>Löschen</Button></span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Auftrag bearbeiten' : 'Neuer Unterakkord-Auftrag'}</DialogTitle></DialogHeader>
          {form && <div className="grid grid-cols-2 gap-3">
            <Field label="Kunde (externe Firma)"><select className={nativeFieldClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">Wählen …</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></Field>
            <Field label="Auftragsnummer"><Input value={form.assignment_number} onChange={(e) => setForm({ ...form, assignment_number: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Bezeichnung"><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Baustelle / Adresse"><Input value={form.worksite_address} onChange={(e) => setForm({ ...form, worksite_address: e.target.value })} /></Field></div>
            <Field label="Beginn"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Ende (optional)"><Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <Field label="Vorarbeiter"><select className={nativeFieldClass} value={form.team_leader_worker_id ?? ''} onChange={(e) => setForm({ ...form, team_leader_worker_id: e.target.value })}><option value="">–</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select></Field>
            <Field label="Soll-Minuten pro Tag"><Input inputMode="numeric" value={form.planned_daily_minutes ?? ''} onChange={(e) => setForm({ ...form, planned_daily_minutes: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })} /></Field>
            <Field label="Status"><select className={nativeFieldClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AssignmentRow['status'] })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Verrechnungsstatus"><select className={nativeFieldClass} value={form.billing_status} onChange={(e) => setForm({ ...form, billing_status: e.target.value })}>{Object.entries(BILLING).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Satz CHF/h (leer = Kunde/Standard)"><Input inputMode="decimal" value={form.hourly} onChange={(e) => setForm({ ...form, hourly: e.target.value })} /></Field>
            <Field label="Samstagssatz CHF/h (leer = Werktagssatz)"><Input inputMode="decimal" value={form.saturday} onChange={(e) => setForm({ ...form, saturday: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Rechnungsreferenz"><Input value={form.invoice_reference} onChange={(e) => setForm({ ...form, invoice_reference: e.target.value })} /></Field></div>
            <div className="col-span-2"><Field label="Notizen"><Input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
          </div>}
          {current && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-sm font-medium">Zugeteilte Mitarbeiter</p>
              {(current.assignment_workers ?? []).map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm"><span>{w.workers?.full_name}</span><Button size="sm" variant="ghost" onClick={async () => { await unterakkordApi.removeWorker(w.id); await load(); }}>Entfernen</Button></div>
              ))}
              <div className="flex gap-2">
                <select className={nativeFieldClass} value={addWorker} onChange={(e) => setAddWorker(e.target.value)}><option value="">Mitarbeiter hinzufügen …</option>{workers.filter((w) => !(current.assignment_workers ?? []).some((x) => x.worker_id === w.id)).map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select>
                <Button size="sm" disabled={!addWorker} onClick={async () => { try { await unterakkordApi.addWorker(current.id, addWorker); setAddWorker(''); await load(); } catch (e) { setError(errorMessage(e)); } }}>Hinzufügen</Button>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Schliessen</Button><Button onClick={() => void save()}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ClientRowEditor = ({ client, onSaved, onError }: { client: ClientRow; onSaved: () => void; onError: (m: string) => void }) => {
  const [v, setV] = useState({ on: client.is_unterakkord_client, hourly: client.billing_hourly_rate == null ? '' : String(client.billing_hourly_rate), sat: client.billing_saturday_rate == null ? '' : String(client.billing_saturday_rate) });
  return (
    <tr className="border-b border-border/50">
      <td className="p-3">{client.company_name}</td>
      <td className="p-3"><input type="checkbox" checked={v.on} onChange={(e) => setV({ ...v, on: e.target.checked })} /></td>
      <td className="p-3 text-right"><Input className="ml-auto w-24 text-right" inputMode="decimal" placeholder="46.00" value={v.hourly} onChange={(e) => setV({ ...v, hourly: e.target.value })} /></td>
      <td className="p-3 text-right"><Input className="ml-auto w-24 text-right" inputMode="decimal" value={v.sat} onChange={(e) => setV({ ...v, sat: e.target.value })} /></td>
      <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={async () => { try { await unterakkordApi.saveClientBilling(client.id, { is_unterakkord_client: v.on, billing_hourly_rate: v.hourly, billing_saturday_rate: v.sat }); toast.success('Gespeichert.'); onSaved(); } catch (e) { onError(errorMessage(e)); } }}>Speichern</Button></td>
    </tr>
  );
};

export default UnterakkordPage;
