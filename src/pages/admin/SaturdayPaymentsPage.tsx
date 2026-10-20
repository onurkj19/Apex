import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { newIdempotencyKey, saturdayApi, type CashReceiptRow, type SaturdayPaymentRow } from '@/lib/v2/api';
import { formatChf, hoursFromMinutes, parseDecimal, sum } from '@/lib/v2/decimal';
import { formatDateDe, todayInZurich } from '@/lib/v2/time';
import { cashReceiptModel, saturdayStatementModel, STATUS_DE } from '@/lib/v2/pdf/models';
import { downloadCsv, downloadPdf } from '@/lib/v2/download';
import { Empty, Field, PageHeader, Stat, StatusBadge, Tag, currentMonth, errorMessage, nativeFieldClass } from '@/components/v2/ui';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { canPaySaturday, canEditPayroll } from '@/lib/permissions';
import type { AppRole } from '@/lib/erp-types';

const CLASSIFICATIONS: Record<string, string> = {
  saturday_supplement: 'Samstagszuschlag',
  regular_hours: 'Reguläre Stunden',
  overtime_reviewed: 'Überstunden (geprüft)',
  other_reviewed: 'Andere (geprüft)',
};

const monthRange = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, '0')}` };
};

const SaturdayPaymentsPage = () => {
  const { profile } = useAdminAuth();
  const role = (profile?.role as AppRole | undefined) ?? null;
  const mayPay = canPaySaturday(role);
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState<SaturdayPaymentRow[]>([]);
  const [receipts, setReceipts] = useState<CashReceiptRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [payDialog, setPayDialog] = useState<{ ids: string[]; worker: string; amount: string } | null>(null);
  const [payDate, setPayDate] = useState(todayInZurich());
  const [payRef, setPayRef] = useState('');
  const payKey = useMemo(() => newIdempotencyKey(), [payDialog]);
  const [rateDialog, setRateDialog] = useState<SaturdayPaymentRow | null>(null);
  const [rate, setRate] = useState({ rate: '', classification: 'saturday_supplement', reason: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const { from, to } = monthRange(month);
      setRows(await saturdayApi.list({ status, from, to }));
      setReceipts(await saturdayApi.receipts());
      setSelected(new Set());
    } catch (e) { setError(errorMessage(e)); }
  }, [month, status]);
  useEffect(() => { void load(); }, [load]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const total = sum(rows.map((r) => parseDecimal(r.amount)));
  const paid = sum(rows.filter((r) => r.status === 'paid').map((r) => parseDecimal(r.amount)));
  const open = sum(rows.filter((r) => r.status !== 'paid').map((r) => parseDecimal(r.amount)));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    try { await fn(); toast.success(ok); await load(); } catch (e) { setError(errorMessage(e)); }
  };

  const startPay = () => {
    const chosen = rows.filter((r) => selected.has(r.id));
    const workers = new Set(chosen.map((r) => r.worker_id));
    if (chosen.length === 0) return;
    if (workers.size > 1) return setError('Eine Barzahlung gilt immer für genau einen Mitarbeiter. Bitte pro Person auswählen.');
    if (chosen.some((r) => r.status === 'paid')) return setError('Bereits bezahlte Einträge können nicht erneut bezahlt werden.');
    if (chosen.some((r) => r.status === 'pending')) return setError('Ausstehende Einträge müssen zuerst genehmigt werden.');
    setPayDialog({ ids: chosen.map((r) => r.id), worker: chosen[0].workers?.full_name ?? '', amount: formatChf(sum(chosen.map((r) => parseDecimal(r.amount)))) });
  };

  const confirmPay = async () => {
    if (!payDialog) return;
    await run(() => saturdayApi.markPaid(payDialog.ids, payDate, payKey, payRef), 'Als bar bezahlt markiert. Quittung erstellt.');
    setPayDialog(null);
  };

  const exportStatement = (kind: 'pdf' | 'csv') => {
    const model = saturdayStatementModel(`${month}`, rows.map((r) => ({ work_date: r.work_date, worker: r.workers?.full_name ?? '', minutes: r.minutes, hourly_rate: String(r.hourly_rate), amount: String(r.amount), status: r.status })), month);
    if (kind === 'pdf') downloadPdf(model); else downloadCsv(model);
  };

  const printReceipt = async (r: CashReceiptRow) => {
    const payments = await saturdayApi.receiptPayments(r.id);
    downloadPdf(cashReceiptModel({ receiptNumber: r.receipt_number, worker: r.workers?.full_name ?? '', paymentDate: r.payment_date, method: r.payment_method, reference: r.payment_reference, payments, confirmedAt: r.confirmed_at, confirmedVia: r.confirmed_via }));
  };

  const confirmPaper = async (r: CashReceiptRow) => {
    const name = window.prompt('Name des bestätigenden Mitarbeiters (Papierquittung unterschrieben):', r.workers?.full_name ?? '');
    if (name) await run(() => saturdayApi.confirmPaper(r.id, name), 'Empfang bestätigt.');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Samstagszahlungen" description="Standard CHF 30.00/h, pro Mitarbeiter konfigurierbar. Barzahlungen bleiben Teil der offiziellen Lohnunterlagen; die rechtliche Einstufung wird nicht automatisch bewertet."
        actions={<><Button variant="outline" onClick={() => exportStatement('pdf')}>PDF</Button><Button variant="outline" onClick={() => exportStatement('csv')}>CSV</Button></>} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={`CHF ${formatChf(total)}`} />
        <Stat label="Offen" value={`CHF ${formatChf(open)}`} tone={open > 0n ? 'warn' : undefined} />
        <Stat label="Bar bezahlt" value={`CHF ${formatChf(paid)}`} tone="good" />
      </div>
      <Card><CardContent className="flex flex-wrap items-end gap-3 pt-4">
        <Field label="Monat"><Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>
        <Field label="Status"><select className={nativeFieldClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Alle</option>{Object.entries(STATUS_DE).filter(([k]) => ['pending', 'approved', 'unpaid', 'paid'].includes(k)).map(([k, v]) => <option key={k} value={k}>{k === 'approved' ? 'Genehmigt' : v}</option>)}</select></Field>
        <div className="ml-auto flex flex-wrap gap-2">
          {mayPay && <Button size="sm" disabled={selected.size === 0} onClick={() => void run(() => saturdayApi.setStatus([...selected], 'approved'), 'Genehmigt.')}>Genehmigen</Button>}
          {mayPay && <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => void run(() => saturdayApi.setStatus([...selected], 'unpaid'), 'Als offen markiert.')}>Als unbezahlt markieren</Button>}
          {mayPay && <Button size="sm" disabled={selected.size === 0} onClick={startPay}>Als bar bezahlt markieren</Button>}
        </div>
      </CardContent></Card>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {!mayPay && <p className="text-xs text-muted-foreground">Nur Administratoren dürfen Zahlungen freigeben oder als bezahlt markieren.</p>}

      <Card><CardContent className="overflow-x-auto p-0">
        {rows.length === 0 ? <Empty>Keine Samstagseinträge.</Empty> : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="p-3" /><th className="p-3">Datum</th><th className="p-3">Mitarbeiter</th><th className="p-3 text-right">Std.</th><th className="p-3 text-right">Satz</th><th className="p-3 text-right">Betrag CHF</th><th className="p-3">Einstufung</th><th className="p-3">Status</th><th className="p-3">Quittung</th><th className="p-3" /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-3">{mayPay && r.status !== 'paid' && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}</td>
                <td className="p-3">{formatDateDe(r.work_date)}</td>
                <td className="p-3">{r.workers?.full_name}</td>
                <td className="p-3 text-right tabular-nums">{hoursFromMinutes(r.minutes)}</td>
                <td className="p-3 text-right tabular-nums">{formatChf(parseDecimal(r.hourly_rate))}</td>
                <td className="p-3 text-right tabular-nums">{formatChf(parseDecimal(r.amount))}</td>
                <td className="p-3 text-xs">{CLASSIFICATIONS[r.payroll_classification] ?? r.payroll_classification}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-xs">{r.cash_receipts?.receipt_number}{r.cash_receipts && !r.cash_receipts.confirmed_at && <Tag tone="warn">unbestätigt</Tag>}</td>
                <td className="p-3 text-right">{canEditPayroll(role) && r.status !== 'paid' && <Button size="sm" variant="ghost" onClick={() => { setRateDialog(r); setRate({ rate: String(r.hourly_rate), classification: r.payroll_classification, reason: '' }); }}>Satz ändern</Button>}</td>
              </tr>))}</tbody>
          </table>
        )}
      </CardContent></Card>

      <PageHeader title="Barquittungen" />
      <Card><CardContent className="space-y-2 pt-4">
        {receipts.length === 0 && <Empty>Noch keine Quittungen.</Empty>}
        {receipts.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3 text-sm">
            <span><b>{r.receipt_number}</b> · {r.workers?.full_name} · {formatDateDe(r.payment_date)} · CHF {formatChf(parseDecimal(r.total_amount))}</span>
            <span className="flex items-center gap-2">
              {r.confirmed_at ? <Tag tone="good">Bestätigt ({r.confirmed_via === 'portal' ? 'Portal' : 'Papier'})</Tag> : <Tag tone="warn">Bestätigung offen</Tag>}
              <Button size="sm" variant="outline" onClick={() => void printReceipt(r)}>PDF</Button>
              {!r.confirmed_at && mayPay && <Button size="sm" variant="outline" onClick={() => void confirmPaper(r)}>Papier bestätigt</Button>}
            </span>
          </div>
        ))}
      </CardContent></Card>

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Barzahlung bestätigen</DialogTitle></DialogHeader>
          <p className="text-sm">{payDialog?.worker}: <b>CHF {payDialog?.amount}</b> in bar. Es wird eine Quittung mit fortlaufender Nummer erstellt. Dieser Schritt kann nicht rückgängig gemacht werden.</p>
          <Field label="Zahlungsdatum"><Input type="date" value={payDate} max={todayInZurich()} onChange={(e) => setPayDate(e.target.value)} /></Field>
          <Field label="Referenz (optional)"><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} /></Field>
          <DialogFooter><Button variant="outline" onClick={() => setPayDialog(null)}>Abbrechen</Button><Button onClick={() => void confirmPay()}>Bar bezahlt bestätigen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rateDialog} onOpenChange={(o) => !o && setRateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Samstagssatz ändern</DialogTitle></DialogHeader>
          <Field label="Stundensatz CHF"><Input inputMode="decimal" value={rate.rate} onChange={(e) => setRate({ ...rate, rate: e.target.value })} /></Field>
          <Field label="Einstufung"><select className={nativeFieldClass} value={rate.classification} onChange={(e) => setRate({ ...rate, classification: e.target.value })}>{Object.entries(CLASSIFICATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Begründung (Pflicht, wird protokolliert)"><Input value={rate.reason} onChange={(e) => setRate({ ...rate, reason: e.target.value })} /></Field>
          <DialogFooter><Button variant="outline" onClick={() => setRateDialog(null)}>Abbrechen</Button><Button onClick={async () => { if (rateDialog) { await run(() => saturdayApi.updateRate(rateDialog.id, rate.rate, rate.classification, rate.reason), 'Satz aktualisiert.'); setRateDialog(null); } }}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaturdayPaymentsPage;
