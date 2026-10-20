import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { leaveApi, type LeaveConflicts } from '@/lib/v2/api';
import { LEAVE_TYPES } from '@/lib/v2/labels';
import { formatDateDe } from '@/lib/v2/time';
import { Empty, PageHeader, StatusBadge, Tag, errorMessage, nativeFieldClass } from '@/components/v2/ui';

type Row = Awaited<ReturnType<typeof leaveApi.list>>[number];

const LeaveManagementPage = () => {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [conflicts, setConflicts] = useState<Record<string, LeaveConflicts | null>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [counter, setCounter] = useState<Record<string, { start: string; end: string }>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setRows(await leaveApi.list(status)); } catch (e) { setError(errorMessage(e)); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const showConflicts = async (id: string) => {
    try { setConflicts({ ...conflicts, [id]: await leaveApi.conflicts(id) }); } catch (e) { setError(errorMessage(e)); }
  };

  const decide = async (r: Row, decision: 'approve' | 'reject' | 'counter_offer') => {
    setError('');
    try {
      await leaveApi.decide(r.id, decision, comment[r.id], decision === 'counter_offer' ? counter[r.id] : undefined);
      toast.success('Entscheid gespeichert. Mitarbeiter wird benachrichtigt.');
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Urlaub &amp; Absenzen" description="Anträge genehmigen oder ablehnen, Gegenvorschläge machen und Konflikte mit Aufträgen und Teamkollegen prüfen." />
      <select className={`${nativeFieldClass} w-60`} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">Offen</option><option value="worker_countered">Gegenvorschlag Mitarbeiter</option><option value="counter_offered">Gegenvorschlag gesendet</option><option value="approved">Genehmigt</option><option value="rejected">Abgelehnt</option><option value="all">Alle</option>
      </select>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {rows.length === 0 && <Card><CardContent><Empty>Keine Anträge.</Empty></CardContent></Card>}
      {rows.map((r) => {
        const c = conflicts[r.id];
        const open = ['pending', 'worker_countered'].includes(r.status);
        const conflictCount = c ? c.other_absences.length + c.assignments.length + c.team_plans.length : 0;
        return (
          <Card key={r.id}><CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{r.workers?.full_name} · {LEAVE_TYPES[r.request_type] ?? r.request_type}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-sm text-muted-foreground">{formatDateDe(r.requested_start_date)} – {formatDateDe(r.requested_end_date)}{r.worker_comment ? ` · „${r.worker_comment}“` : ''}</p>
            <Button size="sm" variant="outline" onClick={() => void showConflicts(r.id)}>Konflikte prüfen</Button>
            {c && (
              <div className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
                {conflictCount === 0 && c.teammates_absent === 0 && <p className="text-emerald-300">Keine Konflikte gefunden.</p>}
                {c.assignments.map((a) => <p key={a.id}><Tag tone="warn">Auftrag</Tag> {a.client} · {a.number} ({formatDateDe(a.start)}{a.end ? ` – ${formatDateDe(a.end)}` : ''})</p>)}
                {c.team_plans.map((t) => <p key={t.id}><Tag tone="warn">Einsatzplan</Tag> {t.title} am {formatDateDe(t.date)}</p>)}
                {c.other_absences.map((o) => <p key={o.id}><Tag>Absenz</Tag> {o.worker} · {LEAVE_TYPES[o.type] ?? o.type} ({formatDateDe(o.start)} – {formatDateDe(o.end)})</p>)}
                {c.teammates_absent > 0 && <p><Tag tone="warn">Team</Tag> {c.teammates_absent} Teamkollege(n) bereits abwesend.</p>}
              </div>
            )}
            {open && (
              <div className="space-y-2">
                <Input placeholder="Kommentar (optional)" value={comment[r.id] ?? ''} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => void decide(r, 'approve')}>Genehmigen</Button>
                  <Button size="sm" variant="destructive" onClick={() => void decide(r, 'reject')}>Ablehnen</Button>
                  <Input type="date" className="w-40" value={counter[r.id]?.start ?? ''} onChange={(e) => setCounter({ ...counter, [r.id]: { start: e.target.value, end: counter[r.id]?.end ?? e.target.value } })} />
                  <Input type="date" className="w-40" value={counter[r.id]?.end ?? ''} onChange={(e) => setCounter({ ...counter, [r.id]: { start: counter[r.id]?.start ?? e.target.value, end: e.target.value } })} />
                  <Button size="sm" variant="outline" disabled={!counter[r.id]?.start} onClick={() => void decide(r, 'counter_offer')}>Gegenvorschlag</Button>
                </div>
              </div>
            )}
            {r.admin_comment && <p className="text-xs text-muted-foreground">Kommentar: {r.admin_comment}</p>}
          </CardContent></Card>
        );
      })}
    </div>
  );
};

export default LeaveManagementPage;
