import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { financeApi, hoursApi, payrollApi, saturdayApi, unterakkordApi, type AssignmentRow } from '@/lib/v2/api';
import { computeFinance, summarizeUnterakkord, totalOf } from '@/lib/v2/finance';
import { monthlyCompanyModel, projectLaborCostModel, saturdayStatementModel, stundenzettelModel, weeklyTeamModel, type ReportModel } from '@/lib/v2/pdf/models';
import { downloadCsv, downloadPdf } from '@/lib/v2/download';
import { toHoursEntry, toTeamWeekEntry } from '@/lib/v2/hours';
import { addDays, isSaturday, mondayOf, todayInZurich } from '@/lib/v2/time';
import { Field, PageHeader, currentMonth, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import type { AppRole } from '@/lib/erp-types';

type Kind = 'stundenzettel' | 'woche' | 'monat' | 'samstag' | 'projekt';

const monthBounds = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return { from: `${m}-01`, to: `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, '0')}` };
};

const PdfReportsPage = () => {
  const { profile } = useAdminAuth();
  const role = (profile?.role as AppRole | undefined) ?? null;
  const payrollViewer = role === 'super_admin' || role === 'admin' || role === 'finance';
  const [kind, setKind] = useState<Kind>('stundenzettel');
  const [month, setMonth] = useState(currentMonth());
  const [week, setWeek] = useState(todayInZurich());
  const [workerId, setWorkerId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    payrollApi.workers().then(setWorkers).catch(() => undefined);
    unterakkordApi.assignments().then(setAssignments).catch(() => undefined);
  }, []);

  const build = async (): Promise<ReportModel> => {
    const { from, to } = monthBounds(month);
    if (kind === 'stundenzettel') {
      if (!workerId) throw new Error('Bitte einen Mitarbeiter wählen.');
      const rows = (await hoursApi.list({ status: 'all', from, to, workerId })).filter((r) => r.status !== 'rejected');
      return stundenzettelModel(workers.find((w) => w.id === workerId)?.full_name ?? '', month, rows.map(toHoursEntry));
    }
    if (kind === 'woche') {
      const monday = mondayOf(week);
      const rows = await hoursApi.list({ status: 'all', from: monday, to: addDays(monday, 6), assignmentId: assignmentId || undefined });
      const a = assignments.find((x) => x.id === assignmentId);
      return weeklyTeamModel(week, rows.map(toTeamWeekEntry), a ? `${a.clients?.company_name} ${a.assignment_number}` : undefined);
    }
    if (kind === 'monat') {
      const rows = await hoursApi.list({ status: 'all', from, to });
      const configs = await payrollApi.configs().catch(() => []);
      const ref = new Map<string, number>(configs.map((c): [string, number] => [c.worker_id, Math.round(Number(c.monthly_reference_hours) * 60)]));
      const byWorker = new Map<string, { worker: string; weekdayApproved: number; saturdayApproved: number; submitted: number; referenceMinutes: number }>();
      rows.forEach((r) => {
        if (!r.worker_id) return;
        const e = byWorker.get(r.worker_id) ?? { worker: r.workers?.full_name ?? '', weekdayApproved: 0, saturdayApproved: 0, submitted: 0, referenceMinutes: ref.get(r.worker_id) ?? 182 * 60 };
        const minutes = r.approved_minutes ?? r.worked_minutes ?? 0;
        if (r.status === 'approved') { if (isSaturday(r.work_date)) e.saturdayApproved += minutes; else e.weekdayApproved += minutes; }
        if (r.status === 'submitted') e.submitted += minutes;
        byWorker.set(r.worker_id, e);
      });
      return monthlyCompanyModel(month, [...byWorker.values()]);
    }
    if (kind === 'samstag') {
      const rows = await saturdayApi.list({ from, to });
      return saturdayStatementModel(month, rows.map((r) => ({ work_date: r.work_date, worker: r.workers?.full_name ?? '', minutes: r.minutes, hourly_rate: String(r.hourly_rate), amount: String(r.amount), status: r.status })), month);
    }
    const inputs = await financeApi.inputs(from, to);
    const summaries = summarizeUnterakkord(computeFinance(inputs), 'assignment');
    return projectLaborCostModel(month, 'Auftrag', summaries, summaries.length ? totalOf(summaries) : undefined);
  };

  const run = async (format: 'pdf' | 'csv') => {
    setError('');
    setBusy(true);
    try {
      const model = await build();
      if (model.rows.length === 0) throw new Error('Keine Daten für diese Auswahl.');
      if (format === 'pdf') downloadPdf(model); else downloadCsv(model);
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const kinds: [Kind, string][] = [['stundenzettel', 'Stundenzettel (Mitarbeiter, Monat)'], ['woche', 'Wochenbericht Team'], ['monat', 'Monatsbericht Arbeitsstunden (Firma)'], ...(payrollViewer ? [['samstag', 'Samstagszahlungen'], ['projekt', 'Projekt- / Lohnkostenbericht']] as [Kind, string][] : [])];

  return (
    <div className="space-y-5">
      <PageHeader title="PDF- &amp; Excel-Berichte" description="A4-PDF und CSV (Excel, Semikolon) auf Deutsch. Die Daten werden mit Ihren Zugriffsrechten geladen; Lohn- und Margenberichte sind nur für Administration und Finanzen verfügbar." />
      <Card><CardContent className="grid gap-3 pt-4 md:grid-cols-2">
        <Field label="Bericht"><select className={nativeFieldClass} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {kind === 'woche' ? <Field label="Woche (beliebiger Tag)"><Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} /></Field> : <Field label="Monat"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>}
        {kind === 'stundenzettel' && <Field label="Mitarbeiter"><select className={nativeFieldClass} value={workerId} onChange={(e) => setWorkerId(e.target.value)}><option value="">Wählen …</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select></Field>}
        {kind === 'woche' && <Field label="Auftrag (optional)"><select className={nativeFieldClass} value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}><option value="">Alle</option>{assignments.map((a) => <option key={a.id} value={a.id}>{a.clients?.company_name} · {a.assignment_number}</option>)}</select></Field>}
        <div className="col-span-full flex gap-2">
          <Button disabled={busy} onClick={() => void run('pdf')}>PDF herunterladen</Button>
          <Button variant="outline" disabled={busy} onClick={() => void run('csv')}>CSV / Excel</Button>
        </div>
        {error && <p className="col-span-full rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </CardContent></Card>
    </div>
  );
};

export default PdfReportsPage;
