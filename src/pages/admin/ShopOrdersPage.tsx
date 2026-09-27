import { useEffect, useState } from 'react';
import { shopOrdersApi } from '@/lib/shop-api';
import type { ShopOrder } from '@/lib/shop-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: 'E re', variant: 'default' },
  processing: { label: 'Në përpunim', variant: 'outline' },
  shipped:    { label: 'E dërguar', variant: 'secondary' },
  delivered:  { label: 'E dorëzuar', variant: 'secondary' },
  cancelled:  { label: 'Anuluar', variant: 'destructive' },
};

const ShopOrdersPage = () => {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setOrders(await shopOrdersApi.list());
    } catch {
      toast.error('Nuk u ngarkuan porositë.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await shopOrdersApi.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success('Statusi u ndryshua.');
    } catch {
      toast.error('Gabim gjatë ndryshimit të statusit.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Porositë e Dyqanit</h2>
          {pending > 0 && (
            <p className="text-sm text-orange-500 font-medium mt-1">
              ⚠️ {pending} porosi të reja presin!
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Rifresko
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nuk ka porosi ende.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, variant: 'outline' as const };
            return (
              <Card key={order.id} className={order.status === 'pending' ? 'border-orange-400' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-primary">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <p className="font-semibold">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_email} {order.customer_phone && `• ${order.customer_phone}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_address}, {order.customer_zip} {order.customer_city}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
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
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div>
                        <p className="text-sm font-semibold mb-2">Produktet:</p>
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
                        <span className="text-muted-foreground">Nëntotali</span>
                        <span>CHF {order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>CHF {order.shipping_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total</span>
                        <span className="text-primary">CHF {order.total.toFixed(2)}</span>
                      </div>

                      {order.notes && (
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs font-semibold mb-1">Shënime nga klienti:</p>
                          <p className="text-sm">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShopOrdersPage;
