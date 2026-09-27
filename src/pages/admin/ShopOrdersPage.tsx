import { useEffect, useState, useCallback } from 'react';
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

// ─── Status labels ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'Neu',            variant: 'default' },
  processing: { label: 'In Bearbeitung', variant: 'outline' },
  shipped:    { label: 'Versandt',       variant: 'secondary' },
  delivered:  { label: 'Geliefert',      variant: 'secondary' },
  cancelled:  { label: 'Storniert',      variant: 'destructive' },
};

const NOTIFY_BUTTONS = [
  { type: 'received',   label: 'Bestellung erhalten' },
  { type: 'processing', label: 'In Bearbeitung' },
  { type: 'shipped',    label: 'Versandt' },
  { type: 'delivered',  label: 'Geliefert' },
  { type: 'cancelled',  label: 'Storniert' },
];

// ─── localStorage helpers for sent notifications ────────────────────────────
const NOTIF_KEY = (orderId: string) => `apex_notified_${orderId}`;

const getSentNotifs = (orderId: string): string[] => {
  try {
    const raw = localStorage.getItem(NOTIF_KEY(orderId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const markNotifSent = (orderId: string, type: string) => {
  const current = getSentNotifs(orderId);
  if (!current.includes(type)) {
    localStorage.setItem(NOTIF_KEY(orderId), JSON.stringify([...current, type]));
  }
};

// ─── Email templates ────────────────────────────────────────────────────────
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

// ─── Notify Dialog ──────────────────────────────────────────────────────────
interface NotifyDialogProps {
  order: ShopOrder;
  type: string;
  onSent: () => void;
  onClose: () => void;
}

const NotifyDialog = ({ order, type, onSent, onClose }: NotifyDialogProps) => {
  const orderNum = order.id.slice(0, 8).toUpperCase();
  const body = buildEmailTemplate(order, type);
  const subject = getSubject(type, orderNum);
  const mailtoLink = `mailto:${order.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleSend = () => {
    markNotifSent(order.id, type);
    onSent();
    onClose();
  };

  const copyText = () => {
    navigator.clipboard.writeText(body);
    toast.success('Text kopiert!');
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-Mail Vorlage — {order.customer_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Empfänger</p>
            <p className="font-medium text-sm border rounded-md px-3 py-2 bg-muted/30">{order.customer_email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Betreff</p>
            <p className="font-medium text-sm border rounded-md px-3 py-2 bg-muted/30">{subject}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Nachricht</p>
            <Textarea value={body} readOnly rows={16} className="text-sm font-mono resize-none" />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <a href={mailtoLink} target="_blank" rel="noopener noreferrer" onClick={handleSend}>
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                E-Mail öffnen & als gesendet markieren
              </Button>
            </a>
            <Button variant="outline" onClick={copyText}>
              <Copy className="h-4 w-4 mr-2" />
              Text kopieren
            </Button>
            <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
const ShopOrdersPage = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyDialog, setNotifyDialog] = useState<{ order: ShopOrder; type: string } | null>(null);
  // Track sent notifications per order (re-render trigger)
  const [sentMap, setSentMap] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await shopOrdersApi.list();
      setOrders(data);
      // Load sent notifications from localStorage
      const map: Record<string, string[]> = {};
      data.forEach((o) => { map[o.id] = getSentNotifs(o.id); });
      setSentMap(map);
    } catch {
      toast.error('Bestellungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refreshSentMap = useCallback((orderId: string) => {
    setSentMap((prev) => ({ ...prev, [orderId]: getSentNotifs(orderId) }));
  }, []);

  const handleStatusChange = async (orderId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(orderId);
    try {
      await shopOrdersApi.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success('Status aktualisiert.');
    } catch {
      toast.error('Fehler beim Aktualisieren des Status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId((prev) => prev === id ? null : id);
  };

  const openNotify = (order: ShopOrder, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifyDialog({ order, type });
  };

  const pending = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Bestellungen vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, variant: 'outline' as const };
            const sentNotifs = sentMap[order.id] ?? [];

            return (
              <Card key={order.id} className={order.status === 'pending' ? 'border-orange-400' : ''}>
                <CardContent className="p-4">
                  {/* Order header row */}
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
                        onValueChange={(v) => {
                          // fake event for stopPropagation pattern
                          setUpdatingId(order.id);
                          shopOrdersApi.updateStatus(order.id, v).then(() => {
                            setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: v } : o));
                            toast.success('Status aktualisiert.');
                          }).catch(() => {
                            toast.error('Fehler beim Aktualisieren.');
                          }).finally(() => setUpdatingId(null));
                        }}
                        disabled={updatingId === order.id}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => toggleExpand(order.id, e)}
                        title={isExpanded ? 'Einklappen' : 'Details anzeigen'}
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Items */}
                      <div>
                        <p className="text-sm font-semibold mb-2">Bestellte Artikel:</p>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.title} × {item.quantity}
                                {item.discount_percent > 0 && (
                                  <span className="ml-1 text-red-500">(-{item.discount_percent}%)</span>
                                )}
                              </span>
                              <span className="font-medium">
                                CHF {(item.unit_price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
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

                      {/* Notification buttons */}
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Kunden benachrichtigen:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {NOTIFY_BUTTONS.map((btn) => {
                            const alreadySent = sentNotifs.includes(btn.type);
                            return (
                              <Button
                                key={btn.type}
                                type="button"
                                variant={alreadySent ? 'secondary' : 'outline'}
                                size="sm"
                                disabled={alreadySent}
                                onClick={(e) => openNotify(order, btn.type, e)}
                                className={alreadySent ? 'opacity-60 cursor-not-allowed' : ''}
                                title={alreadySent ? 'Bereits gesendet' : `E-Mail senden: ${btn.label}`}
                              >
                                {alreadySent
                                  ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                  : <Mail className="h-3 w-3 mr-1" />}
                                {btn.label}
                                {alreadySent && ' ✓'}
                              </Button>
                            );
                          })}
                        </div>
                        {sentNotifs.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            ✓ = E-Mail bereits an den Kunden gesendet
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notify dialog */}
      {notifyDialog && (
        <NotifyDialog
          order={notifyDialog.order}
          type={notifyDialog.type}
          onSent={() => refreshSentMap(notifyDialog.order.id)}
          onClose={() => setNotifyDialog(null)}
        />
      )}
    </div>
  );
};

export default ShopOrdersPage;
