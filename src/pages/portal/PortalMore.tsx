import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { portalApi, saturdayApi, type CashReceiptRow } from '@/lib/v2/api';
import { cashReceiptModel } from '@/lib/v2/pdf/models';
import { downloadPdf } from '@/lib/v2/download';
import { formatChf, parseDecimal } from '@/lib/v2/decimal';
import { formatDateDe } from '@/lib/v2/time';
import { Empty, Tag, errorMessage } from '@/components/v2/ui';
import { usePortal } from './context';

type Notification = Awaited<ReturnType<typeof portalApi.notifications>>[number];

const PortalMore = () => {
  const { profile } = usePortal();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [receipts, setReceipts] = useState<CashReceiptRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    portalApi.notifications().then(setNotes).catch((e) => setError(errorMessage(e)));
    portalApi.myReceipts().then(setReceipts).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const printReceipt = async (r: CashReceiptRow) => {
    const payments = await saturdayApi.receiptPayments(r.id);
    downloadPdf(cashReceiptModel({
      receiptNumber: r.receipt_number, worker: r.workers?.full_name ?? profile.full_name ?? '', paymentDate: r.payment_date,
      method: r.payment_method, reference: r.payment_reference, payments, confirmedAt: r.confirmed_at, confirmedVia: r.confirmed_via,
    }));
  };

  const confirm = async (r: CashReceiptRow) => {
    if (!window.confirm(`Empfang von CHF ${formatChf(parseDecimal(r.total_amount))} in bar bestätigen?`)) return;
    try {
      await portalApi.confirmReceipt(r.id, profile.full_name ?? '');
      toast.success('Empfang bestätigt.');
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Barquittungen &amp; Dokumente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {receipts.length === 0 && <Empty>Keine Quittungen.</Empty>}
          {receipts.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.receipt_number}</p>
                {r.confirmed_at ? <Tag tone="good">Bestätigt</Tag> : <Tag tone="warn">Bestätigung offen</Tag>}
              </div>
              <p className="text-sm text-muted-foreground">{formatDateDe(r.payment_date)} · CHF {formatChf(parseDecimal(r.total_amount))}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void printReceipt(r)}>PDF</Button>
                {!r.confirmed_at && <Button size="sm" onClick={() => void confirm(r)}>Empfang bestätigen</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Benachrichtigungen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {notes.length === 0 && <Empty>Keine Benachrichtigungen.</Empty>}
          {notes.map((n) => (
            <button key={n.id} type="button" className="block w-full rounded-lg border border-border/70 p-3 text-left"
              onClick={async () => { if (!n.read_at) { await portalApi.markNotificationRead(n.id); load(); } }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalMore;
