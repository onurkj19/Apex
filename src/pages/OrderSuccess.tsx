import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShoppingBag, Home } from 'lucide-react';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = (location.state as { orderId?: string })?.orderId || '—';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 pt-28 pb-20">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-24 w-24 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold">Bestellung bestätigt!</h1>

          <div className="bg-muted/40 rounded-2xl p-6 space-y-2">
            <p className="text-muted-foreground text-sm">Bestellnummer</p>
            <p className="text-2xl font-mono font-bold text-primary">#{orderId}</p>
          </div>

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              Vielen Dank für Ihre Bestellung! Wir werden uns in Kürze mit Ihnen in Verbindung setzen, um die Details zu bestätigen.
            </p>
            <p>
              Die Bestellung wird per <strong>Swiss Post</strong> versendet — die Rechnung liegt dem Paket bei.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button onClick={() => navigate('/products')}>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Weiter einkaufen
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Startseite
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
