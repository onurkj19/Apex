import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { shopOrdersApi, discountedPrice } from '@/lib/shop-api';
import type { ShopOrderItem } from '@/lib/shop-api'; // used for order items typing
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingCart, Truck, Package } from 'lucide-react';
import { toast } from 'sonner';
const SHIPPING_COST = 9.90; // CHF — mund ta ndryshosh

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    notes: '',
  });

  const grandTotal = total + SHIPPING_COST;

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Ihr Warenkorb ist leer!');
      return;
    }

    setSubmitting(true);
    try {
      const orderItems: ShopOrderItem[] = items.map(({ product, quantity }) => ({
        product_id: product.id,
        title: product.title,
        price: product.price,
        discount_percent: product.discount_percent,
        quantity,
        unit_price: discountedPrice(product.price, product.discount_percent),
      }));

      const order = await shopOrdersApi.create({
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        customer_address: form.address,
        customer_city: form.city,
        customer_zip: form.zip,
        items: orderItems,
        subtotal: total,
        shipping_cost: SHIPPING_COST,
        total: grandTotal,
        notes: form.notes,
      });

      clearCart();
      navigate('/order-success', { state: { orderId: order.id.slice(0, 8).toUpperCase() } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Fehler: ${msg}`);
      console.error('Order error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-20 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h1 className="text-2xl font-bold mb-4">Ihr Warenkorb ist leer</h1>
          <Button onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zum Shop
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <h1 className="text-3xl font-bold">Kasse</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ihre Angaben</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Vollständiger Name *</Label>
                    <Input required value={form.name} onChange={update('name')} placeholder="Max Mustermann" />
                  </div>
                  <div>
                    <Label>E-Mail *</Label>
                    <Input required type="email" value={form.email} onChange={update('email')} placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input type="tel" value={form.phone} onChange={update('phone')} placeholder="+41 76 000 00 00" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Adresse *</Label>
                    <Input required value={form.address} onChange={update('address')} placeholder="Musterstrasse 1" />
                  </div>
                  <div>
                    <Label>Ort *</Label>
                    <Input required value={form.city} onChange={update('city')} placeholder="Zürich" />
                  </div>
                  <div>
                    <Label>Postleitzahl *</Label>
                    <Input required value={form.zip} onChange={update('zip')} placeholder="8000" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Anmerkungen (optional)</Label>
                    <Textarea value={form.notes} onChange={update('notes')} placeholder="Lieferhinweise oder sonstige Anmerkungen..." rows={3} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                    Lieferung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Versand per Post (Swiss Post)</p>
                      <p className="text-sm text-muted-foreground">3–5 Werktage</p>
                    </div>
                    <span className="font-semibold">CHF {SHIPPING_COST.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * Nach Auftragsbestätigung bereiten wir das Paket vor und senden es Ihnen zusammen mit der Rechnung zu.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Bestellübersicht
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y">
                    {items.map(({ product, quantity }) => {
                      const unitPrice = discountedPrice(product.price, product.discount_percent);
                      return (
                        <div key={product.id} className="flex items-center gap-3 py-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded-lg border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug line-clamp-2">{product.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">× {quantity}</p>
                          </div>
                          <span className="text-sm font-semibold shrink-0">
                            CHF {(unitPrice * quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zwischensumme</span>
                    <span>CHF {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Versand</span>
                    <span>CHF {SHIPPING_COST.toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Gesamtbetrag</span>
                    <span className="text-primary">CHF {grandTotal.toFixed(2)}</span>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Wird gesendet...' : '✓ Bestellung aufgeben'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Zahlung per Rechnung. Wir kontaktieren Sie nach der Bestätigung.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
