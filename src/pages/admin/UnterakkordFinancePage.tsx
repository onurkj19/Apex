import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { financeApi } from '@/lib/v2/api';
import { computeFinance, summarizeApexProjects, summarizeUnterakkord, totalAllocatedLabor, totalOf, type FinanceInputs, type GroupBy, type Summary } from '@/lib/v2/finance';
import { formatChf, formatDecimal, hoursFromMinutes } from '@/lib/v2/decimal';
import { projectLaborCostModel } from '@/lib/v2/pdf/models';
import { downloadCsv, downloadPdf } from '@/lib/v2/download';
import { Empty, Field, PageHeader, Stat, Tag, currentMonth, errorMessage, nativeFieldClass } from '@/components/v2/ui';

const GROUPS: [GroupBy, string, 'Kunde' | 'Auftrag' | 'Mitarbeiter'][] = [
  ['client', 'Kunde', 'Kunde'], ['assignment', 'Auftrag', 'Auftrag'], ['employee', 'Mitarbeiter', 'Mitarbeiter'],
  ['week', 'Woche', 'Auftrag'], ['month', 'Monat', 'Auftrag'], ['year', 'Jahr', 'Auftrag'],
];

const FLAG_TEXT: Record<string, string> = {
  missing_salary: 'Monatslohn fehlt – Lohnkosten nicht berechnet',
  unallocated_salary: 'Monatslohn ohne Werktagsstunden – nicht zugeordnet',
  missing_billing_rate: 'Verrechnungssatz fehlt',
  saturday_without_payment: 'Samstagseintrag ohne Zahlungsdatensatz',
};

const SummaryTable = ({ rows, total, label }: { rows: Summary[]; total: Summary | null; label: string }) => (
  <Card><CardContent className="overflow-x-auto p-0">
    {rows.length === 0 ? <Empty>Keine Daten im Zeitraum.</Empty> : (
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="p-3">{label}</th><th className="p-3 text-right">Std. gearb.</th><th className="p-3 text-right">Std. verr.</th><th className="p-3 text-right">Umsatz</th><th className="p-3 text-right">Lohnkosten</th><th className="p-3 text-right">davon Samstag</th><th className="p-3 text-right">Spesen</th><th className="p-3 text-right">Marge</th><th className="p-3 text-right">Marge %</th></tr></thead>
        <tbody>
          {rows.map((s) => <Row key={s.key} s={s} />)}
          {total && <Row s={total} bold />}
        </tbody>
      </table>
    )}
  </CardContent></Card>
);

const Row = ({ s, bold }: { s: Summary; bold?: boolean }) => (
  <tr className={`border-b border-border/50 ${bold ? 'font-semibold' : ''}`}>
    <td className="p-3">{s.label}</td>
    <td className="p-3 text-right tabular-nums">{hoursFromMinutes(s.workedMinutes)}</td>
    <td className="p-3 text-right tabular-nums">{hoursFromMinutes(s.billableMinutes)}</td>
    <td className="p-3 text-right tabular-nums">{formatChf(s.revenue)}</td>
    <td className="p-3 text-right tabular-nums">{formatChf(s.laborCost)}</td>
    <td className="p-3 text-right tabular-nums">{formatChf(s.saturdayCost)}</td>
    <td className="p-3 text-right tabular-nums">{formatChf(s.expenses)}</td>
    <td className={`p-3 text-right tabular-nums ${s.margin < 0n ? 'text-red-400' : 'text-emerald-400'}`}>{formatChf(s.margin)}</td>
    <td className="p-3 text-right tabular-nums">{s.marginPercent === null ? '–' : `${formatDecimal(s.marginPercent, 1)} %`}</td>
  </tr>
);

const UnterakkordFinancePage = () => {
  const [from, setFrom] = useState(currentMonth());
  const [to, setTo] = useState(currentMonth());
  const [group, setGroup] = useState<GroupBy>('client');
  const [estimate, setEstimate] = useState(false);
  const [inputs, setInputs] = useState<FinanceInputs | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setInputs(await financeApi.inputs(`${from}-01`, `${to}-01`)); } catch (e) { setError(errorMessage(e)); }
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const result = useMemo(() => (inputs ? computeFinance(inputs, { includeStatuses: estimate ? ['approved', 'submitted'] : ['approved'] }) : null), [inputs, estimate]);
  const rows = useMemo(() => (result ? summarizeUnterakkord(result, group) : []), [result, group]);
  const total = useMemo(() => (rows.length ? totalOf(rows) : null), [rows]);
  const apex = useMemo(() => (result ? summarizeApexProjects(result) : []), [result]);
  const estimatedCount = result?.entries.filter((e) => e.status !== 'approved' || e.rateIsProjected).length ?? 0;
  const period = from === to ? from : `${from} bis ${to}`;
  const groupMeta = GROUPS.find((g) => g[0] === group)!;

  const exportModel = () => projectLaborCostModel(period, groupMeta[2], rows, total ?? undefined);

  return (
    <div className="space-y-5">
      <PageHeader title="Finanzen Unterakkord" description="Umsatz = verrechenbare Stunden × Satz. Lohnkosten = Monatslohn anteilig nach Minuten (jeder Lohn nur einmal über Apex-Projekte und Unterakkord verteilt) plus direkte Samstagskosten."
        actions={<><Button variant="outline" disabled={!rows.length} onClick={() => downloadPdf(exportModel())}>PDF</Button><Button variant="outline" disabled={!rows.length} onClick={() => downloadCsv(exportModel())}>CSV</Button></>} />
      <Card><CardContent className="flex flex-wrap items-end gap-3 pt-4">
        <Field label="Von (Monat)"><Input type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></Field>
        <Field label="Bis (Monat)"><Input type="month" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></Field>
        <Field label="Gruppieren nach"><select className={nativeFieldClass} value={group} onChange={(e) => setGroup(e.target.value as GroupBy)}>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={estimate} onChange={(e) => setEstimate(e.target.checked)} />inkl. eingereichte Stunden (Schätzung)</label>
      </CardContent></Card>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      {total && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Umsatz CHF" value={formatChf(total.revenue)} />
          <Stat label="Lohnkosten CHF" value={formatChf(total.laborCost)} />
          <Stat label="Spesen CHF" value={formatChf(total.expenses)} />
          <Stat label="Marge CHF" value={formatChf(total.margin)} tone={total.margin < 0n ? 'bad' : 'good'} hint={total.marginPercent === null ? undefined : `${formatDecimal(total.marginPercent, 1)} %`} />
          <Stat label="Umsatz pro Std." value={total.revenuePerHour === null ? '–' : formatChf(total.revenuePerHour)} />
          <Stat label="Kosten pro Std." value={total.costPerHour === null ? '–' : formatChf(total.costPerHour)} />
          <Stat label="Samstagskosten CHF" value={formatChf(total.saturdayCost)} />
          <Stat label="Nicht zugeordneter Lohn CHF" value={result ? formatChf(result.unallocatedSalary) : '–'} tone={result && result.unallocatedSalary > 0n ? 'warn' : undefined} />
        </div>
      )}
      {estimate && estimatedCount > 0 && <p className="text-xs text-amber-300">{estimatedCount} Einträge sind Schätzungen (eingereicht oder mit vorläufigem Satz).</p>}

      <SummaryTable rows={rows} total={total} label={groupMeta[1]} />

      {result && result.flags.length > 0 && (
        <Card className="border-amber-500/40"><CardHeader className="pb-2"><CardTitle className="text-base">Hinweise zur Datenqualität</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(result.flags.reduce<Record<string, number>>((acc, f) => { acc[f.code] = (acc[f.code] ?? 0) + 1; return acc; }, {})).map(([code, n]) => <p key={code}><Tag tone="warn">{n}×</Tag> {FLAG_TEXT[code] ?? code}</p>)}
          </CardContent></Card>
      )}

      <PageHeader title="Eigene Apex-Projekte (Lohnkosten)" description="Gleiche Lohnverteilung, getrennt von Unterakkord. Zusammen mit Unterakkord ergibt sich der gesamte zugeordnete Lohn ohne Doppelzählung." />
      <SummaryTable rows={apex} total={apex.length ? totalOf(apex) : null} label="Projekt" />
      {result && <p className="text-xs text-muted-foreground">Gesamter zugeordneter Lohn im Zeitraum: CHF {formatChf(totalAllocatedLabor(result))} · davon nicht zugeordnet: CHF {formatChf(result.unallocatedSalary)}</p>}
    </div>
  );
};

export default UnterakkordFinancePage;
