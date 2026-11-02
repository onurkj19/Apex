import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { portalApi, type Target, type TimeEntryRow, type SaturdayPaymentRow, type MonthOverview } from '@/lib/v2/api';
import { calculateWorkedMinutes, formatDateDe, isSaturday, todayInZurich } from '@/lib/v2/time';
import { hoursFromMinutes, formatChf, parseDecimal } from '@/lib/v2/decimal';
import { currentMonth, Empty, Field, StatusBadge, errorMessage, nativeFieldClass, Tag } from '@/components/v2/ui';
import { monthLabelDe, weekdayDe } from '@/lib/v2/pdf/models';
import { downloadPdf } from '@/lib/v2/download';
import { stundenzettelModel } from '@/lib/v2/pdf/models';
import { usePortal } from './context';

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) : '';

interface FormState {
  id: string | null;
  date: string;
  targetKey: string;
  start: string;
  end: string;
  breakMinutes: string;
  worksite: string;
  description: string;
  comment: string;
}

const emptyForm = (): FormState => ({ id: null, date: todayInZurich(), targetKey: '', start: '07:00', end: '16:00', breakMinutes: '60', worksite: '', description: '', comment: '' });

const PortalHours = () => {
  const { profile } = usePortal();
  const [month, setMonth] = useState(currentMonth());
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [saturday, setSaturday] = useState<SaturdayPaymentRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [e, o, s] = await Promise.all([portalApi.myEntries(month), portalApi.overview(month), portalApi.saturdayPayments(month)]);
      setEntries(e);
      setOverview(o);
      setSaturday(s);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [month]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { portalApi.targets().then(setTargets).catch((e) => setError(errorMessage(e))); }, []);

  const target = targets.find((t) => `${t.kind}:${t.id}` === form.targetKey) ?? null;
  const check = useMemo(() => calculateWorkedMinutes({ start: form.start, end: form.end, breakMinutes: Number(form.breakMinutes) }), [form.start, form.end, form.breakMinutes]);

  const submit = async () => {
    setError('');
    if (!form.id && !target) return setError('Bitte Auftrag oder Projekt wählen.');
    if (check.ok === false) return setError(check.error);
    setBusy(true);
    try {
      if (form.id) {
        await portalApi.updateEntry({ id: form.id, start: form.start, end: form.end, breakMinutes: Number(form.breakMinutes), worksite: form.worksite, description: form.description, comment: form.comment });
        toast.success('Eintrag aktualisiert und erneut eingereicht.');
      } else {
        await portalApi.submitEntry({ date: form.date, start: form.start, end: form.end, breakMinutes: Number(form.breakMinutes), target, worksite: form.worksite || target?.address || '', description: form.description, comment: form.comment });
        toast.success('Stunden eingereicht.');
      }
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const edit = (e: TimeEntryRow) => {
    setForm({
      id: e.id,
      date: e.work_date,
      targetKey: e.assignment_id ? `assignment:${e.assignment_id}` : e.project_id ? `project:${e.project_id}` : '',
      start: clock(e.start_at),
      end: clock(e.end_at),
      breakMinutes: String(e.break_minutes),
      worksite: e.worksite ?? '',
      description: e.work_description ?? '',
      comment: e.comment ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (e: TimeEntryRow) => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    try {
      await portalApi.deleteEntry(e.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const exportPdf = () => {
    const model = stundenzettelModel(
      profile.full_name ?? 'Mitarbeiter',
      month,
      entries.map((e) => ({
        work_date: e.work_date,
        start: clock(e.start_at),
        end: clock(e.end_at),
        break_minutes: e.break_minutes,
        minutes: e.approved_minutes ?? e.worked_minutes ?? 0,
        worked_minutes: e.worked_minutes ?? 0,
        target: e.subcontract_assignments?.assignment_number ?? e.projects?.project_name ?? '',
        worksite: e.worksite,
        status: e.status,
      })),
    );
    downloadPdf(model);
  };

  const satTotal = saturday.reduce((sum, p) => sum + parseDecimal(p.amount), 0n);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{form.id ? 'Eintrag korrigieren' : 'Stunden erfassen'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!form.id && (
            <Field label="Auftrag / Projekt">
              <select className={nativeFieldClass} value={form.targetKey} onChange={(e) => setForm({ ...form, targetKey: e.target.value })}>
                <option value="">Bitte wählen …</option>
                {targets.map((t) => <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{t.label}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum" hint={isSaturday(form.date) ? 'Samstag – wird separat erfasst' : weekdayDe(form.date)}>
              <Input type="date" value={form.date} disabled={!!form.id} max={todayInZurich()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Pause (Min.)"><Input inputMode="numeric" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Beginn"><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="Ende"><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            {check.ok === false ? <p className="text-sm text-amber-300">{check.error}</p> : <p className="text-lg font-semibold tabular-nums">{hoursFromMinutes(check.minutes)} Std.</p>}
          </div>
          <Field label="Baustelle"><Input value={form.worksite} placeholder={target?.address ?? ''} onChange={(e) => setForm({ ...form, worksite: e.target.value })} /></Field>
          <Field label="Beschreibung der Arbeit"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Kommentar (optional)"><Input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy || check.ok === false} onClick={submit}>{form.id ? 'Speichern & einreichen' : 'Einreichen'}</Button>
            {form.id && <Button variant="outline" onClick={() => setForm(emptyForm())}>Abbrechen</Button>}
          </div>
          <p className="text-xs text-muted-foreground">Mehrere Einsätze pro Tag sind möglich, sofern sich die Zeiten nicht überschneiden.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Monatsübersicht</CardTitle>
            <Input type="month" className="w-40" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-emerald-500/10 p-2"><p className="text-base font-semibold tabular-nums">{hoursFromMinutes(overview.approved_minutes)}</p>Genehmigt</div>
              <div className="rounded-lg bg-amber-500/10 p-2"><p className="text-base font-semibold tabular-nums">{hoursFromMinutes(overview.submitted_minutes)}</p>Offen</div>
              <div className="rounded-lg bg-muted p-2"><p className="text-base font-semibold tabular-nums">{hoursFromMinutes(overview.saturday_approved_minutes + overview.saturday_submitted_minutes)}</p>Samstag</div>
            </div>
          )}
          {entries.length === 0 && <Empty>Keine Einträge in {monthLabelDe(month)}.</Empty>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{weekdayDe(e.work_date)} {formatDateDe(e.work_date)} {e.is_saturday && <Tag tone="info">Samstag</Tag>}</p>
                <StatusBadge status={e.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {clock(e.start_at)}–{clock(e.end_at)} · Pause {e.break_minutes} Min. · <span className="font-semibold text-foreground">{hoursFromMinutes(e.approved_minutes ?? e.worked_minutes ?? 0)} Std.</span>
                {e.approved_minutes !== null && e.worked_minutes !== null && e.approved_minutes !== e.worked_minutes && <span> (erfasst {hoursFromMinutes(e.worked_minutes)})</span>}
              </p>
              <p className="text-xs text-muted-foreground">{e.subcontract_assignments?.assignment_number ?? e.projects?.project_name} {e.worksite ? `· ${e.worksite}` : ''}</p>
              {e.status === 'rejected' && e.super_admin_comment && <p className="mt-1 text-xs text-red-300">Grund: {e.super_admin_comment}</p>}
              {(e.status === 'submitted' || e.status === 'rejected') && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(e)}>Korrigieren</Button>
                  {e.status === 'submitted' && <Button size="sm" variant="ghost" onClick={() => remove(e)}>Löschen</Button>}
                </div>
              )}
            </div>
          ))}
          {entries.length > 0 && <Button variant="outline" className="w-full" onClick={exportPdf}>Stundenzettel (PDF)</Button>}
        </CardContent>
      </Card>

      {saturday.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Samstagsstunden</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {saturday.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{formatDateDe(p.work_date)} · {hoursFromMinutes(p.minutes)} Std. à {formatChf(parseDecimal(p.hourly_rate))}</span>
                <span className="flex items-center gap-2"><span className="tabular-nums">CHF {formatChf(parseDecimal(p.amount))}</span><StatusBadge status={p.status} /></span>
              </div>
            ))}
            <p className="border-t border-border pt-2 text-right text-sm font-semibold">Total CHF {formatChf(satTotal)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalHours;
