import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { calendarApi, payrollApi, type CalendarData } from '@/lib/v2/api';
import { addDays, formatDateDe, isSaturday } from '@/lib/v2/time';
import { LEAVE_TYPES } from '@/lib/v2/labels';
import { Empty, PageHeader, Tag, currentMonth, errorMessage } from '@/components/v2/ui';
import { weekdayDe, monthLabelDe } from '@/lib/v2/pdf/models';

const CONFLICT_LABELS: Record<string, string> = {
  double_booked_worker: 'Mitarbeiter doppelt eingeplant',
  worker_absent: 'Eingeplant trotz Abwesenheit',
  vehicle_double_booked: 'Fahrzeug doppelt eingeplant',
  assignment_absence: 'Auftrag trotz Abwesenheit zugeteilt',
  material_over_reserved: 'Material überreserviert',
};

const CalendarConflictsPage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<CalendarData | null>(null);
  const [conflicts, setConflicts] = useState<Awaited<ReturnType<typeof calendarApi.conflicts>>>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([]);
  const [error, setError] = useState('');

  const days = useMemo(() => {
    const first = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: count }, (_, i) => addDays(first, i));
  }, [month]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [cal, conf, w] = await Promise.all([calendarApi.calendar(days[0], days[days.length - 1]), calendarApi.conflicts(days[0], days[days.length - 1]), payrollApi.workers()]);
      setData(cal); setConflicts(conf); setWorkers(w.filter((x) => x.is_active));
    } catch (e) { setError(errorMessage(e)); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  const cell = (workerId: string, day: string) => {
    if (!data) return null;
    const leave = data.leaves.find((l) => l.worker_id === workerId && l.start <= day && l.end >= day);
    const assignment = data.assignments.find((a) => a.worker_ids.includes(workerId) && a.start <= day && (a.end ?? '9999-12-31') >= day && a.status !== 'completed');
    const plan = data.plans.find((p) => p.date === day && p.worker_ids.includes(workerId));
    return { leave, assignment, plan };
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Kalender &amp; Konflikte" description="Gemeinsame Übersicht von Abwesenheiten, Unterakkord-Aufträgen und Einsatzplänen. Konflikte werden automatisch erkannt." />
      <Input type="month" className="w-48" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <Card><CardContent className="space-y-2 pt-4">
        <p className="text-sm font-semibold">Konflikte in {monthLabelDe(month)} ({conflicts.length})</p>
        {conflicts.length === 0 && <p className="text-sm text-emerald-300">Keine Konflikte erkannt.</p>}
        {conflicts.map((c, i) => <p key={i} className="text-sm"><Tag tone="bad">{CONFLICT_LABELS[c.type] ?? c.type}</Tag> {c.date ? `${formatDateDe(c.date)} · ` : ''}{c.detail}</p>)}
      </CardContent></Card>

      <Card><CardContent className="overflow-x-auto p-0">
        {workers.length === 0 ? <Empty>Keine Mitarbeiter.</Empty> : (
          <table className="min-w-full text-xs">
            <thead><tr className="border-b border-border"><th className="sticky left-0 bg-card p-2 text-left">Mitarbeiter</th>{days.map((d) => <th key={d} className={`p-1 text-center font-normal ${isSaturday(d) ? 'text-blue-300' : 'text-muted-foreground'}`}>{weekdayDe(d)}<br />{d.slice(8)}</th>)}</tr></thead>
            <tbody>{workers.map((w) => (
              <tr key={w.id} className="border-b border-border/40">
                <td className="sticky left-0 whitespace-nowrap bg-card p-2">{w.full_name}</td>
                {days.map((d) => {
                  const c = cell(w.id, d);
                  const title = [c?.leave && `${LEAVE_TYPES[c.leave.type] ?? c.leave.type} (${c.leave.status})`, c?.assignment && `Auftrag ${c.assignment.number} – ${c.assignment.client}`, c?.plan && `Plan: ${c.plan.title}`].filter(Boolean).join('\n');
                  const clash = c?.leave && (c.assignment || c.plan);
                  return (
                    <td key={d} title={title} className="p-0.5 text-center">
                      <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${clash ? 'bg-red-500/40' : c?.leave ? (c.leave.status === 'approved' ? 'bg-amber-500/40' : 'bg-amber-500/15') : c?.assignment ? 'bg-emerald-500/30' : c?.plan ? 'bg-blue-500/30' : ''}`}>
                        {clash ? '!' : c?.leave ? 'A' : c?.assignment ? 'U' : c?.plan ? 'P' : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>))}</tbody>
          </table>
        )}
        <p className="p-3 text-xs text-muted-foreground">A = Abwesenheit (dunkel = genehmigt), U = Unterakkord-Auftrag, P = Einsatzplan, ! = Konflikt.</p>
      </CardContent></Card>
    </div>
  );
};

export default CalendarConflictsPage;
