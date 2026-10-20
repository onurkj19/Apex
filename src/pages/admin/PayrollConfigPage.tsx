import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { payrollApi, type SalaryConfigRow } from '@/lib/v2/api';
import { Empty, Field, PageHeader, Tag, currentMonth, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { canEditPayroll } from '@/lib/permissions';
import type { AppRole } from '@/lib/erp-types';
import { formatChf, parseDecimal } from '@/lib/v2/decimal';

const CONTRACT: Record<string, string> = { monthly_fixed: 'Monatslohn (fix)', hourly: 'Stundenlohn', other: 'Andere' };
const CLASS: Record<string, string> = { saturday_supplement: 'Samstagszuschlag', regular_hours: 'Reguläre Stunden', overtime_reviewed: 'Überstunden (geprüft)', other_reviewed: 'Andere (geprüft)' };

const blank = (workerId: string): SalaryConfigRow => ({
  worker_id: workerId, monthly_gross_salary: null, contract_type: 'monthly_fixed', monthly_reference_hours: 182, saturday_hourly_rate: 30,
  saturday_payroll_classification: 'saturday_supplement', employer_cost_percent: null, employer_cost_applies_to_saturday: true, is_active: true, notes: null,
});

const PayrollConfigPage = () => {
  const { profile } = useAdminAuth();
  const canEdit = canEditPayroll((profile?.role as AppRole | undefined) ?? null);
  const [workers, setWorkers] = useState<{ id: string; full_name: string; is_active: boolean }[]>([]);
  const [configs, setConfigs] = useState<Map<string, SalaryConfigRow>>(new Map());
  const [month, setMonth] = useState(currentMonth());
  const [monthly, setMonthly] = useState<Map<string, string>>(new Map());
  const [editing, setEditing] = useState<SalaryConfigRow | null>(null);
  const [override, setOverride] = useState<{ workerId: string; name: string; value: string } | null>(null);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof payrollApi.audit>>>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [w, c, m] = await Promise.all([payrollApi.workers(), payrollApi.configs(), payrollApi.monthlySalaries(month)]);
      setWorkers(w.filter((x) => x.is_active));
      setConfigs(new Map(c.map((x) => [x.worker_id, x])));
      setMonthly(new Map(m.map((x) => [x.worker_id, String(x.gross_salary)])));
      setAudit(await payrollApi.audit(40));
    } catch (e) { setError(errorMessage(e)); }
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    try {
      await payrollApi.saveConfig({
        ...editing,
        monthly_gross_salary: editing.monthly_gross_salary === '' || editing.monthly_gross_salary === null ? null : Number(editing.monthly_gross_salary),
        employer_cost_percent: editing.employer_cost_percent === '' || editing.employer_cost_percent === null ? null : Number(editing.employer_cost_percent),
        monthly_reference_hours: Number(editing.monthly_reference_hours),
        saturday_hourly_rate: Number(editing.saturday_hourly_rate),
      });
      toast.success('Lohnkonfiguration gespeichert.');
      setEditing(null);
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Lohnkonfiguration" description="Nur für Administration und Finanzen sichtbar. Monatslöhne werden manuell erfasst; es werden keine Beträge vorgegeben. Ein Festlohn wird nicht automatisch anhand der Stunden angepasst." />
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {!canEdit && <p className="text-xs text-muted-foreground">Nur Lesezugriff. Änderungen sind Administratoren vorbehalten.</p>}
      <Card><CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="p-3">Mitarbeiter</th><th className="p-3">Vertrag</th><th className="p-3 text-right">Monatslohn brutto</th><th className="p-3 text-right">Ref.-Std.</th><th className="p-3 text-right">Samstag CHF/h</th><th className="p-3 text-right">AG-Kosten %</th><th className="p-3 text-right">Lohn {month}</th><th className="p-3" /></tr></thead>
          <tbody>{workers.map((w) => {
            const c = configs.get(w.id);
            return (
              <tr key={w.id} className="border-b border-border/50">
                <td className="p-3">{w.full_name}</td>
                <td className="p-3">{c ? CONTRACT[c.contract_type] : <Tag tone="warn">nicht konfiguriert</Tag>}</td>
                <td className="p-3 text-right tabular-nums">{c?.monthly_gross_salary != null ? formatChf(parseDecimal(c.monthly_gross_salary)) : '–'}</td>
                <td className="p-3 text-right tabular-nums">{c ? String(c.monthly_reference_hours) : '182'}</td>
                <td className="p-3 text-right tabular-nums">{formatChf(parseDecimal(c?.saturday_hourly_rate ?? 30))}</td>
                <td className="p-3 text-right tabular-nums">{c?.employer_cost_percent ?? '–'}</td>
                <td className="p-3 text-right tabular-nums">{monthly.has(w.id) ? formatChf(parseDecimal(monthly.get(w.id)!)) : '–'}</td>
                <td className="whitespace-nowrap p-3 text-right">{canEdit && <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c ? { ...c } : blank(w.id))}>Bearbeiten</Button>
                  <Button size="sm" variant="ghost" onClick={() => setOverride({ workerId: w.id, name: w.full_name, value: monthly.get(w.id) ?? '' })}>Monatslohn</Button></>}</td>
              </tr>);
          })}</tbody>
        </table>
        {workers.length === 0 && <Empty>Keine aktiven Mitarbeiter.</Empty>}
      </CardContent></Card>
      <Field label="Monat für Monatslohn-Übersicht"><Input type="month" className="w-48" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Änderungsprotokoll (Lohn &amp; Samstag)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs">
          {audit.length === 0 && <Empty>Keine Einträge.</Empty>}
          {audit.map((a) => <p key={a.id} className="border-b border-border/40 py-1"><span className="text-muted-foreground">{new Date(a.created_at).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}</span> · {a.table_name} · {a.operation}</p>)}
        </CardContent></Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{workers.find((w) => w.id === editing?.worker_id)?.full_name}</DialogTitle></DialogHeader>
          {editing && <div className="grid grid-cols-2 gap-3">
            <Field label="Vertragsart"><select className={nativeFieldClass} value={editing.contract_type} onChange={(e) => setEditing({ ...editing, contract_type: e.target.value })}>{Object.entries(CONTRACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Monatslohn brutto CHF" hint="Leer lassen, wenn unbekannt."><Input inputMode="decimal" value={editing.monthly_gross_salary ?? ''} onChange={(e) => setEditing({ ...editing, monthly_gross_salary: e.target.value })} /></Field>
            <Field label="Referenzstunden / Monat"><Input inputMode="decimal" value={String(editing.monthly_reference_hours)} onChange={(e) => setEditing({ ...editing, monthly_reference_hours: e.target.value })} /></Field>
            <Field label="Samstagssatz CHF/h"><Input inputMode="decimal" value={String(editing.saturday_hourly_rate)} onChange={(e) => setEditing({ ...editing, saturday_hourly_rate: e.target.value })} /></Field>
            <Field label="Einstufung Samstag"><select className={nativeFieldClass} value={editing.saturday_payroll_classification} onChange={(e) => setEditing({ ...editing, saturday_payroll_classification: e.target.value })}>{Object.entries(CLASS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Arbeitgeberkosten % (optional)"><Input inputMode="decimal" value={editing.employer_cost_percent ?? ''} onChange={(e) => setEditing({ ...editing, employer_cost_percent: e.target.value })} /></Field>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.employer_cost_applies_to_saturday} onChange={(e) => setEditing({ ...editing, employer_cost_applies_to_saturday: e.target.checked })} />Arbeitgeberkosten gelten auch für Samstagszahlungen</label>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />Konfiguration aktiv</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Abbrechen</Button><Button onClick={() => void save()}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!override} onOpenChange={(o) => !o && setOverride(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Monatslohn {month} – {override?.name}</DialogTitle></DialogHeader>
          <Field label="Bruttolohn CHF (überschreibt den Standard-Monatslohn für diesen Monat)"><Input inputMode="decimal" value={override?.value ?? ''} onChange={(e) => override && setOverride({ ...override, value: e.target.value })} /></Field>
          <DialogFooter><Button variant="outline" onClick={() => setOverride(null)}>Abbrechen</Button><Button onClick={async () => { if (override) { try { await payrollApi.saveMonthlySalary(override.workerId, month, override.value); setOverride(null); toast.success('Gespeichert.'); await load(); } catch (e) { setError(errorMessage(e)); } } }}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollConfigPage;
