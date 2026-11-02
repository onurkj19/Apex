import {
  type Decimal,
  formatChf,
  formatDecimal,
  hoursFromMinutes,
  parseDecimal,
  sum,
} from '../decimal';
import { addDays, formatDateDe, isSaturday, mondayOf } from '../time';
import type { Summary } from '../finance';
import type { Column } from './writer';

export interface ReportModel {
  filename: string;
  title: string;
  subtitle: string;
  columns: Column[];
  rows: string[][];
  totalRow?: string[];
  meta: [string, string][];
  note?: string;
  signatures?: string[];
  landscape?: boolean;
}

export const STATUS_DE: Record<string, string> = {
  running: 'Läuft',
  submitted: 'Eingereicht',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
  pending: 'Ausstehend',
  unpaid: 'Offen (unbezahlt)',
  paid: 'Bar bezahlt',
};

const WEEKDAY_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const weekdayDe = (iso: string) => WEEKDAY_DE[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export const monthLabelDe = (month: string) => {
  const names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const [y, m] = month.split('-').map(Number);
  return `${names[m - 1]} ${y}`;
};

const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');

export interface HoursEntry {
  work_date: string;
  start: string | null;
  end: string | null;
  break_minutes: number;
  /** Authoritative minutes (approved when set, else worked). */
  minutes: number;
  worked_minutes: number;
  target: string;
  worksite: string | null;
  status: string;
  is_saturday?: boolean;
}

/** Stundenzettel for one worker and month. */
export const stundenzettelModel = (worker: string, month: string, entries: HoursEntry[]): ReportModel => {
  const sorted = [...entries].sort((a, b) => `${a.work_date} ${a.start ?? ''}`.localeCompare(`${b.work_date} ${b.start ?? ''}`));
  const approved = sorted.filter((e) => e.status === 'approved');
  const pending = sorted.filter((e) => e.status === 'submitted');
  const totalOf = (list: HoursEntry[]) => list.reduce((acc, e) => acc + e.minutes, 0);
  const saturday = approved.filter((e) => isSaturday(e.work_date)).reduce((acc, e) => acc + e.minutes, 0);
  return {
    filename: `Stundenzettel_${safe(worker)}_${month}`,
    title: 'Stundenzettel',
    subtitle: `${worker} · ${monthLabelDe(month)}`,
    meta: [
      ['Mitarbeiter', worker],
      ['Monat', monthLabelDe(month)],
      ['Genehmigte Stunden', hoursFromMinutes(totalOf(approved))],
      ['davon Samstag', hoursFromMinutes(saturday)],
      ['Noch nicht genehmigt', hoursFromMinutes(totalOf(pending))],
    ],
    columns: [
      { header: 'Datum', width: 22 },
      { header: 'Tag', width: 10 },
      { header: 'Auftrag / Projekt', width: 40 },
      { header: 'Baustelle', width: 40 },
      { header: 'Von', width: 13, align: 'center' },
      { header: 'Bis', width: 13, align: 'center' },
      { header: 'Pause', width: 14, align: 'right' },
      { header: 'Std.', width: 14, align: 'right' },
      { header: 'Status', width: 24 },
    ],
    rows: sorted.map((e) => [
      formatDateDe(e.work_date),
      weekdayDe(e.work_date),
      e.target,
      e.worksite ?? '',
      e.start ?? '',
      e.end ?? '',
      `${e.break_minutes} min`,
      hoursFromMinutes(e.minutes),
      STATUS_DE[e.status] ?? e.status,
    ]),
    totalRow: ['Total genehmigt', '', '', '', '', '', '', hoursFromMinutes(totalOf(approved)), ''],
    signatures: ['Mitarbeiter', 'Vorarbeiter / Bauleiter', 'Apex Gerüste GmbH'],
    note: 'Nur genehmigte Stunden sind massgebend. Eingereichte, noch nicht genehmigte Stunden sind separat ausgewiesen.',
  };
};

export interface TeamWeekEntry {
  worker: string;
  work_date: string;
  minutes: number;
  status: string;
}

export const weeklyTeamModel = (anyDateInWeek: string, entries: TeamWeekEntry[], team?: string): ReportModel => {
  const monday = mondayOf(anyDateInWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const byWorker = new Map<string, Map<string, number>>();
  entries
    .filter((e) => e.status === 'approved' || e.status === 'submitted')
    .forEach((e) => {
      if (!byWorker.has(e.worker)) byWorker.set(e.worker, new Map());
      const m = byWorker.get(e.worker)!;
      m.set(e.work_date, (m.get(e.work_date) ?? 0) + e.minutes);
    });
  const workers = [...byWorker.keys()].sort((a, b) => a.localeCompare(b, 'de'));
  const dayTotals = days.map(() => 0);
  const rows = workers.map((w) => {
    let total = 0;
    const cells = days.map((d, i) => {
      const minutes = byWorker.get(w)!.get(d) ?? 0;
      total += minutes;
      dayTotals[i] += minutes;
      return minutes ? hoursFromMinutes(minutes) : '';
    });
    return [w, ...cells, hoursFromMinutes(total)];
  });
  const grand = dayTotals.reduce((a, b) => a + b, 0);
  return {
    filename: `Wochenbericht_${monday}`,
    title: 'Wochenbericht Team',
    subtitle: `${team ? `${team} · ` : ''}KW ab ${formatDateDe(monday)} bis ${formatDateDe(days[6])}`,
    meta: [['Woche', `${formatDateDe(monday)} – ${formatDateDe(days[6])}`], ['Mitarbeitende', String(workers.length)]],
    columns: [
      { header: 'Mitarbeiter', width: 50 },
      ...days.map((d) => ({ header: `${weekdayDe(d)} ${d.slice(8)}.${d.slice(5, 7)}`, width: 17, align: 'right' as const })),
      { header: 'Total', width: 13, align: 'right' },
    ],
    rows,
    totalRow: ['Total', ...dayTotals.map((m) => (m ? hoursFromMinutes(m) : '')), hoursFromMinutes(grand)],
    note: 'Stunden inkl. eingereichter, noch nicht genehmigter Einträge.',
    signatures: ['Vorarbeiter', 'Bauleitung'],
  };
};

export interface MonthlyWorkerRow {
  worker: string;
  weekdayApproved: number;
  saturdayApproved: number;
  submitted: number;
  referenceMinutes: number;
}

export const monthlyCompanyModel = (month: string, rows: MonthlyWorkerRow[]): ReportModel => {
  const sorted = [...rows].sort((a, b) => a.worker.localeCompare(b.worker, 'de'));
  const tot = sorted.reduce(
    (acc, r) => ({ w: acc.w + r.weekdayApproved, s: acc.s + r.saturdayApproved, p: acc.p + r.submitted, ref: acc.ref + r.referenceMinutes }),
    { w: 0, s: 0, p: 0, ref: 0 },
  );
  const diff = (approved: number, ref: number) => {
    const d = approved - ref;
    return `${d < 0 ? '-' : ''}${hoursFromMinutes(Math.abs(d))}`;
  };
  return {
    filename: `Monatsstunden_${month}`,
    title: 'Monatsbericht Arbeitsstunden',
    subtitle: monthLabelDe(month),
    meta: [['Monat', monthLabelDe(month)], ['Mitarbeitende', String(sorted.length)]],
    columns: [
      { header: 'Mitarbeiter', width: 48 },
      { header: 'Mo–Fr', width: 22, align: 'right' },
      { header: 'Samstag', width: 22, align: 'right' },
      { header: 'Genehmigt', width: 24, align: 'right' },
      { header: 'Eingereicht', width: 24, align: 'right' },
      { header: 'Soll', width: 20, align: 'right' },
      { header: 'Diff.', width: 22, align: 'right' },
    ],
    rows: sorted.map((r) => [
      r.worker,
      hoursFromMinutes(r.weekdayApproved),
      hoursFromMinutes(r.saturdayApproved),
      hoursFromMinutes(r.weekdayApproved + r.saturdayApproved),
      hoursFromMinutes(r.submitted),
      hoursFromMinutes(r.referenceMinutes),
      diff(r.weekdayApproved + r.saturdayApproved, r.referenceMinutes),
    ]),
    totalRow: ['Total', hoursFromMinutes(tot.w), hoursFromMinutes(tot.s), hoursFromMinutes(tot.w + tot.s), hoursFromMinutes(tot.p), hoursFromMinutes(tot.ref), diff(tot.w + tot.s, tot.ref)],
    note: 'Soll = monatliche Referenzstunden gemäss Konfiguration. Die Referenz dient nur zum Vergleich; Festlöhne werden nicht automatisch angepasst.',
  };
};

export interface SaturdayRow {
  work_date: string;
  worker: string;
  minutes: number;
  hourly_rate: string;
  amount: string;
  status: string;
}

export const saturdayStatementModel = (periodLabel: string, rows: SaturdayRow[], filenameKey: string): ReportModel => {
  const sorted = [...rows].sort((a, b) => `${a.worker} ${a.work_date}`.localeCompare(`${b.worker} ${b.work_date}`, 'de'));
  const total: Decimal = sum(sorted.map((r) => parseDecimal(r.amount)));
  const paid: Decimal = sum(sorted.filter((r) => r.status === 'paid').map((r) => parseDecimal(r.amount)));
  const minutes = sorted.reduce((a, r) => a + r.minutes, 0);
  return {
    filename: `Samstagszahlungen_${filenameKey}`,
    title: 'Samstagszahlungen',
    subtitle: periodLabel,
    meta: [
      ['Zeitraum', periodLabel],
      ['Total CHF', formatChf(total)],
      ['Davon bar bezahlt CHF', formatChf(paid)],
      ['Offen CHF', formatChf(total - paid)],
    ],
    columns: [
      { header: 'Datum', width: 22 },
      { header: 'Mitarbeiter', width: 50 },
      { header: 'Std.', width: 16, align: 'right' },
      { header: 'Satz CHF/h', width: 24, align: 'right' },
      { header: 'Betrag CHF', width: 28, align: 'right' },
      { header: 'Status', width: 42 },
    ],
    rows: sorted.map((r) => [formatDateDe(r.work_date), r.worker, hoursFromMinutes(r.minutes), formatChf(parseDecimal(r.hourly_rate)), formatChf(parseDecimal(r.amount)), STATUS_DE[r.status] ?? r.status]),
    totalRow: ['Total', '', hoursFromMinutes(minutes), '', formatChf(total), ''],
    note: 'Barzahlungen bleiben Bestandteil der offiziellen Lohnunterlagen. Die Einstufung des Samstagszuschlags ist konfigurierbar und wird nicht automatisch rechtlich bewertet.',
    signatures: ['Verantwortliche Person', 'Buchhaltung'],
  };
};

export const projectLaborCostModel = (periodLabel: string, kind: 'Kunde' | 'Auftrag' | 'Mitarbeiter' | 'Projekt', summaries: Summary[], total?: Summary): ReportModel => {
  const money = (v: Decimal) => formatChf(v);
  const pct = (p: Decimal | null) => (p === null ? '–' : `${formatDecimal(p, 1)} %`);
  const row = (s: Summary) => [s.label, hoursFromMinutes(s.workedMinutes), hoursFromMinutes(s.billableMinutes), money(s.revenue), money(s.laborCost), money(s.expenses), money(s.margin), pct(s.marginPercent)];
  return {
    filename: `Projektkosten_${kind}_${safe(periodLabel)}`,
    title: 'Projekt- und Lohnkostenbericht',
    subtitle: `${kind} · ${periodLabel}`,
    landscape: true,
    meta: [['Zeitraum', periodLabel], ['Gruppierung', kind]],
    columns: [
      { header: kind, width: 58 },
      { header: 'Std. gearb.', width: 26, align: 'right' },
      { header: 'Std. verr.', width: 26, align: 'right' },
      { header: 'Umsatz CHF', width: 34, align: 'right' },
      { header: 'Lohnkosten CHF', width: 36, align: 'right' },
      { header: 'Spesen CHF', width: 30, align: 'right' },
      { header: 'Marge CHF', width: 34, align: 'right' },
      { header: 'Marge %', width: 24, align: 'right' },
    ],
    rows: summaries.map(row),
    totalRow: total ? row(total) : undefined,
    note: 'Lohnkosten: Monatslohn anteilig nach Minuten auf Aufträge und Projekte verteilt (jeder Lohn nur einmal), zuzüglich direkter Samstagskosten.',
  };
};

export interface CashReceiptInput {
  receiptNumber: string;
  worker: string;
  paymentDate: string;
  method: string;
  reference: string | null;
  payments: { work_date: string; minutes: number; hourly_rate: string; amount: string }[];
  confirmedAt: string | null;
  confirmedVia: string | null;
}

export const cashReceiptModel = (input: CashReceiptInput): ReportModel => {
  const total = sum(input.payments.map((p) => parseDecimal(p.amount)));
  const minutes = input.payments.reduce((a, p) => a + p.minutes, 0);
  return {
    filename: `Barquittung_${safe(input.receiptNumber)}`,
    title: `Barzahlungsquittung ${input.receiptNumber}`,
    subtitle: `${input.worker} · ${formatDateDe(input.paymentDate)}`,
    meta: [
      ['Mitarbeiter', input.worker],
      ['Zahlungsdatum', formatDateDe(input.paymentDate)],
      ['Zahlungsart', input.method === 'cash' ? 'Bar' : input.method],
      ['Referenz', input.reference ?? '–'],
      ['Betrag CHF', formatChf(total)],
      ['Bestätigung', input.confirmedAt ? `Bestätigt am ${formatDateDe(input.confirmedAt.slice(0, 10))} (${input.confirmedVia === 'portal' ? 'Portal' : 'Papier'})` : 'Ausstehend'],
    ],
    columns: [
      { header: 'Samstag', width: 30 },
      { header: 'Std.', width: 24, align: 'right' },
      { header: 'Satz CHF/h', width: 36, align: 'right' },
      { header: 'Betrag CHF', width: 40, align: 'right' },
    ],
    rows: input.payments.map((p) => [formatDateDe(p.work_date), hoursFromMinutes(p.minutes), formatChf(parseDecimal(p.hourly_rate)), formatChf(parseDecimal(p.amount))]),
    totalRow: ['Total', hoursFromMinutes(minutes), '', formatChf(total)],
    note: 'Ich bestätige den Erhalt des oben genannten Betrags in bar. Die Zahlung wird in den offiziellen Lohnunterlagen geführt.',
    signatures: ['Mitarbeiter (Empfangsbestätigung)', 'Auszahlende Person'],
  };
};

