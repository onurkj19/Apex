import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { leaveRequestApi } from '@/lib/erp-api';
import type { LeaveRequest, LeaveRequestType } from '@/lib/erp-types';
import { leaveApi } from '@/lib/v2/api';
import { LEAVE_TYPES } from '@/lib/v2/labels';
import { formatDateDe, todayInZurich } from '@/lib/v2/time';
import { Empty, Field, StatusBadge, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { usePortal } from './context';

const PortalLeave = () => {
  const { profile } = usePortal();
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [type, setType] = useState<LeaveRequestType>('annual_leave');
  const [from, setFrom] = useState(todayInZurich());
  const [to, setTo] = useState(todayInZurich());
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<{ tracked: boolean; entitlement?: number; used?: number; remaining?: number } | null>(null);

  const load = useCallback(() => {
    leaveRequestApi.listMine().then(setRows).catch((e) => setError(errorMessage(e)));
    if (profile.worker_id) leaveApi.balance(profile.worker_id, new Date().getFullYear()).then(setBalance).catch(() => setBalance(null));
  }, [profile.worker_id]);
  useEffect(load, [load]);

  const submit = async () => {
    setError('');
    if (to < from) return setError('Das Enddatum liegt vor dem Beginn.');
    setBusy(true);
    try {
      await leaveRequestApi.createMine({ request_type: type, requested_start_date: from, requested_end_date: to, worker_comment: comment });
      toast.success(type === 'sick_notification' ? 'Krankmeldung gesendet.' : 'Antrag gesendet.');
      setComment('');
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Abwesenheit melden</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Art">
            <select className={nativeFieldClass} value={type} onChange={(e) => setType(e.target.value as LeaveRequestType)}>
              {Object.entries(LEAVE_TYPES).filter(([k]) => k !== 'day_off').map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von"><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} /></Field>
            <Field label="Bis"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Field label="Bemerkung (optional)"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <Button className="w-full" disabled={busy} onClick={submit}>{type === 'sick_notification' ? 'Krank melden' : 'Antrag senden'}</Button>
          {balance?.tracked && (
            <p className="text-xs text-muted-foreground">Ferienanspruch {new Date().getFullYear()}: {balance.entitlement ?? '–'} Tage, bezogen {balance.used ?? 0}, verbleibend {balance.remaining ?? '–'}.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Meine Anträge</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <Empty>Keine Anträge.</Empty>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{LEAVE_TYPES[r.request_type] ?? r.request_type}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-muted-foreground">{formatDateDe(r.requested_start_date)} – {formatDateDe(r.requested_end_date)}</p>
              {r.admin_comment && <p className="mt-1 text-xs text-muted-foreground">Verwaltung: {r.admin_comment}</p>}
              {r.status === 'counter_offered' && r.admin_counter_start_date && (
                <div className="mt-2 space-y-2 rounded-md bg-blue-500/10 p-2 text-sm">
                  <p>Gegenvorschlag: {formatDateDe(r.admin_counter_start_date)} – {formatDateDe(r.admin_counter_end_date ?? r.admin_counter_start_date)}</p>
                  <Button size="sm" onClick={async () => { try { await leaveRequestApi.respondToCounter(r.id, { accept: true }); load(); } catch (e) { setError(errorMessage(e)); } }}>Akzeptieren</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLeave;
