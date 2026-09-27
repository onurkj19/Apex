import { useCallback, useEffect, useState } from 'react';
import { shopOrdersApi } from '@/lib/shop-api';
import type { ShopOrder } from '@/lib/shop-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw, Mail, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'pending',    label: 'Neu',             color: 'bg-yellow-500' },
  { key: 'processing', label: 'In Bearbeitung',  color: 'bg-blue-500' },
  { key: 'shipped',    label: 'Versandt',         color: 'bg-purple-500' },
  { key: 'delivered',  label: 'Geliefert',        color: 'bg-green-500' },
  { key: 'cancelled',  label: 'Storniert',        color: 'bg-red-500' },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Neu',            variant: 'default' },
  processing: { label: 'In Bearbeitung', variant: 'outline' },
  shipped:    { label: 'Versandt',       variant: 'secondary' },
  delivered:  { label: 'Geliefert',      variant: 'secondary' },
  cancelled:  { label: 'Storniert',      variant: 'destructive' },
};

// ─── Notification tracking (localStorage) ────────────────────────────────────

const STORAGE_KEY = 'apex-shop-notifications-sent';

const getSentMap = (): Record<string, string[]> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const markSent = (orderId: string, type: string) => {
  const map = getSentMap();
  map[orderId] = Array.from(new Set([...(map[orderId] || []), type]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

const isSent = (orderId: string, type: string): boolean => {
  const map = getSentMap();
  return (map[orderId] || []).includes(type);
};

// ─── Email templates ──────────────────────────────────────────────────────────

const buildEmailTemplate = (order: ShopOrder, type: string): string => {
  const itemsList = order.items
    .map((i) => `• ${i.title} × ${i.quantity} — CHF ${(i.unit_price * i.quantity).toFixed(2)}`)
    .join('\n');
  const orderNum = order.id.slice(0, 8).toUpperCase();

  const templates: Record<string, string> = {
    received: `Sehr geehrte/r ${order.customer_name},

vielen Dank für Ihre Bestellung bei Apex Gerüste GmbH!

Ihre Bestellnummer: #${orderNum}

Bestellte Artikel:
${itemsList}

Zwischensumme: CHF ${order.subtotal.toFixed(2)}
Versand: CHF ${order.shipping_cost.toFixed(2)}
Gesamtbetrag: CHF ${order.total.toFixed(2)}

Wir werden Ihre Bestellung so schnell wie möglich bearbeiten und Sie benachrichtigen, sobald das Paket versandt wurde.

Mit freundlichen Grüssen
Apex Gerüste GmbH
info@apex-gerueste.ch`,

    processing: `Sehr geehrte/r ${order.customer_name},

Ihre Bestellung #${orderNum} wird aktuell von uns bearbeitet und vorbereitet.

Wir informieren Sie, sobald das Paket versandbereit ist.

Mit freundlichen Grüssen
Apex Gerüste GmbH
info@apex-gerueste.ch`,

    shipped: `Sehr geehrte/r ${order.customer_name},

Ihre Bestellung #${orderNum} wurde heute versandt!

Lieferadresse: ${order.customer_address}, ${order.customer_zip} ${order.customer_city}

Die Lieferung erfolgt per Swiss Post und dauert in der Regel 3–5 Werktage. Die Rechnung liegt dem Paket bei.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüssen
Apex Gerüste GmbH
info@apex-gerueste.ch`,

    delivered: `Sehr geehrte/r ${order.customer_name},

wir hoffen, Ihre Bestellung #${orderNum} ist gut bei Ihnen angekommen!

Wir würden uns über Ihr Feedback freuen. Bei Fragen oder Reklamationen stehen wir Ihnen jederzeit zur Verfügung.

Vielen Dank für Ihr Vertrauen in Apex Gerüste GmbH.

Mit freundlichen Grüssen
Apex Gerüste GmbH
info@apex-gerueste.ch`,

    cancelled: `Sehr geehrte/r ${order.customer_name},

leider müssen wir Ihnen mitteilen, dass Ihre Bestellung #${orderNum} storniert wurde.

Falls Sie Fragen haben oder eine alternative Lösung wünschen, kontaktieren Sie uns bitte unter info@apex-gerueste.ch.

Wir entschuldigen uns für etwaige Unannehmlichkeiten.

Mit freundlichen Grüssen
Apex Gerüste GmbH
info@apex-gerueste.ch`,
  };
  return templates[type] || templates.received;
};

const getSubject = (type: string, orderNum: string): string => ({
  received:   `Bestellbestätigung #${orderNum} – Apex Gerüste GmbH`,
  processing: `Ihre Bestellung #${orderNum} wird bearbeitet`,
  shipped:    `Ihre Bestellung #${orderNum} wurde versandt`,
  delivered:  `Lieferbestätigung #${orderNum}`,
  cancelled:  `Stornierung Bestellung #${orderNum}`,
}[type] ?? `Bestellung #${orderNum}`);

// ─── Notify dialog ────────────────────────────────────────────────────────────

interface NotifyDialogProps {
  order: ShopOrder;
  type: string;
  onClose: () => void;
  onSent: () => void;
}

const NotifyDialog = ({ order, type, onClose, onSent }: NotifyDialogProps) => {
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const body = buildEmailTemplate(order, type);
  const subject = getSubject(type, orderNum);
  const mailtoLink = `mailto:${order.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleOpen = () => {
    markSent(order.id, type);
    onSent();
    window.open(mailtoLink, '_blank');
    onClose();
  };

  const copyText = () => {
    navigator.clipboard.writeText(body);
    toast.success('Text kopiert!');
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-Mail Vorlage — {order.customer_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Betreff:</p>
            <p className="font-medium text-sm border rounded-md px-3 py-2 bg-muted/30">{subject}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Nachricht:</p>
            <Textarea value={body} readOnly rows={16} className="text-sm font-mono resize-none" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleOpen}>
              <ExternalLink className="h-4 w-4 mr-2" />
              E-Mail öffnen &amp; als gesendet markieren
            </Button>
            <Button variant="outline" onClick={copyText}>
              <Copy className="h-4 w-4 mr-2" />
              Text kopieren
            </Button>
            <Button variant="ghost" onClick={onClose}>Schliessen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Notify buttons row ───────────────────────────────────────────────────────

const NOTIFY_TYPES = [
  { type: 'received',   label: 'Bestellung erhalten', statusKey: 'pending' },
  { type: 'processing', label: 'In Bearbeitung',       statusKey: 'processing' },
  { type: 'shipped',    label: 'Versandt',              statusKey: 'shipped' },
  { type: 'delivered',  label: 'Geliefert',             statusKey: 'delivered' },
  { type: 'cancelled',  label: 'Storniert',             statusKey: 'cancelled' },
];

interface NotifyButtonsProps {
  order: ShopOrder;
  sentTypes: string[];
  onOpen: (type: string) => void;
}

const NotifyButtons = ({ order, sentTypes, onOpen }: NotifyButtonsProps) => {
  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="border-t pt-4">
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Mail className="h-4 w-4" />
        Kunden benachrichtigen:
      </p>
      <div className="flex flex-wrap gap-2">
        {NOTIFY_TYPES.map((btn, i) => {
          const sent = sentTypes.includes(btn.type);
          const isCurrentStatus = btn.statusKey === order.status;
          const isCancelled = btn.type === 'cancelled';
          // highlight the step matching current status
          const isActive = isCurrentStatus;

          return (
            <Button
              key={btn.type}
              type="button"
              size="sm"
              disabled={sent}
              onClick={(e) => { e.stopPropagation(); onOpen(btn.type); }}
              variant={isActive ? 'default' : 'outline'}
              className={[
                sent ? 'opacity-50 cursor-not-allowed line-through' : '',
                isActive && !sent ? 'ring-2 ring-offset-1 ring-primary' : '',
                isCancelled && !sent ? 'border-red-500 text-red-500 hover:bg-red-50' : '',
              ].join(' ')}
            >
              {sent
                ? <><CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />{btn.label}</>
                : <><Mail className="h-3 w-3 mr-1" />{btn.label}</>
              }
            </Button>
          );
        })}
      </div>

      {/* Status progress bar */}
      {order.status !== 'cancelled' && (
        <div className="mt-4">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.filter(s => s.key !== 'cancelled').map((step, idx) => {
              const stepIdx = STATUS_STEPS.filter(s => s.key !== 'cancelled').findIndex(s => s.key === order.status);
              const done = idx <= stepIdx;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className={`flex-1 h-1.5 rounded-full transition-all ${done ? 'bg-primary' : 'bg-muted'}`} />
                  {idx === STATUS_STEPS.filter(s => s.key !== 'cancelled').length - 1 && null}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {STATUS_STEPS.filter(s => s.key !== 'cancelled').map((step, idx) => {
              const steps = STATUS_STEPS.filter(s => s.key !== 'cancelled');
              const stepIdx = steps.findIndex(s => s.key === order.status);
              const done = idx <= stepIdx;
              return (
                <span key={step.key} className={`text-xs ${done ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ShopOrdersPage = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyDialog, setNotifyDialog] = useState<{ order: ShopOrder; type: string } | null>(null);
  const [sentMap, setSentMap] = useState<Record<string, string[]>>(getSentMap);

  const refreshSent = useCallback(() => setSentMap(getSentMap()), []);

  const load = async () => {
    setLoading(true);
    try { setOrders(await shopOrdersApi.list()); }
    catch { toast.error('Bestellungen konnten nicht geladen werden.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await shopOrdersApi.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success('Status aktualisiert.');
    } catch { toast.error('Fehler beim Aktualisieren.'); }
    finally { setUpdatingId(null); }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId((prev) => prev === id ? null : id);
  };

  const pending = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Shop-Bestellungen</h2>
          {pending > 0 && (
            <p className="text-sm text-orange-500 font-medium mt-1">
              ⚠️ {pending} neue Bestellung{pending > 1 ? 'en' : ''} warten!
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card><div className="py-16 text-center text-muted-foreground p-4">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Noch keine Bestellungen vorhanden.</p>
        </div></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, variant: 'outline' as const };
            const sentTypes = sentMap[order.id] || [];

            return (
              <Card key={order.id} className={order.status === 'pending' ? 'border-orange-400' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-primary">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <p className="font-semibold">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_email}{order.customer_phone && ` • ${order.customer_phone}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_address}, {order.customer_zip} {order.customer_city}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">CHF {order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('de-CH')}
                        </p>
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(v) => handleStatusChange(order.id, v)}
                        disabled={updatingId === order.id}
                      >
                        <SelectTrigger className="w-36" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" onClick={(e) => toggleExpand(order.id, e)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">Bestellte Artikel:</p>
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm py-0.5">
                            <span className="text-muted-foreground">
                              {item.title} × {item.quantity}
                              {item.discount_percent > 0 && <span className="ml-1 text-red-500">(-{item.discount_percent}%)</span>}
                            </span>
                            <span className="font-medium">CHF {(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground">Zwischensumme</span>
                        <span>CHF {order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Versand</span>
                        <span>CHF {order.shipping_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Gesamtbetrag</span>
                        <span className="text-primary">CHF {order.total.toFixed(2)}</span>
                      </div>
                      {order.notes && (
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs font-semibold mb-1">Anmerkungen des Kunden:</p>
                          <p className="text-sm">{order.notes}</p>
                        </div>
                      )}

                      <NotifyButtons
                        order={order}
                        sentTypes={sentTypes}
                        onOpen={(type) => setNotifyDialog({ order, type })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {notifyDialog && (
        <NotifyDialog
          order={notifyDialog.order}
          type={notifyDialog.type}
          onClose={() => setNotifyDialog(null)}
          onSent={refreshSent}
        />
      )}
    </div>
  );
};

export default ShopOrdersPage;
