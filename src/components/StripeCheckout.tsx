import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Shield, CheckCircle, XCircle } from 'lucide-react';
import { stripeAPI } from '@/services/api';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description: string;
}

interface StripeCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartTotal: number;
  onCheckoutSuccess: () => void;
  onCheckoutCancel: () => void;
}

const StripeCheckout = ({ 
  isOpen, 
  onClose, 
  cart, 
  cartTotal, 
  onCheckoutSuccess, 
  onCheckoutCancel 
}: StripeCheckoutProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Schweiz'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const shippingCost = cartTotal > 100 ? 0 : 15;
  const total = cartTotal + shippingCost;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = 'Email ist erforderlich';
    if (!formData.name) newErrors.name = 'Name ist erforderlich';
    if (!formData.address) newErrors.address = 'Adresse ist erforderlich';
    if (!formData.city) newErrors.city = 'Stadt ist erforderlich';
    if (!formData.postalCode) newErrors.postalCode = 'PLZ ist erforderlich';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Ungültige Email-Adresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    setPaymentStatus('idle');

    try {
      // Create checkout session with backend
      const sessionData = await stripeAPI.createCheckoutSession({
        items: cart.map(item => ({
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          images: [item.image]
        })),
        customerEmail: formData.email,
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/products`
      });

      // Redirect to Stripe Checkout
      window.location.href = sessionData.url;

    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Checkout - Zahlung
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Bestellübersicht</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}x CHF {item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">
                    CHF {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Zwischensumme:</span>
                <span>CHF {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Versand:</span>
                <span>{shippingCost === 0 ? 'Kostenlos' : `CHF ${shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Gesamt:</span>
                <span>CHF {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Rechnungsadresse</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <Label htmlFor="name">Vollständiger Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="address">Straße & Hausnummer *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
              
              <div>
                <Label htmlFor="city">Stadt *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
              
              <div>
                <Label htmlFor="postalCode">PLZ *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className={errors.postalCode ? 'border-red-500' : ''}
                />
                {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Zahlungsmethode</h3>
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
              <CreditCard className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">Kreditkarte / Debitkarte</p>
                <p className="text-sm text-muted-foreground">
                  Visa, Mastercard, American Express
                </p>
              </div>
            </div>
          </div>

          {/* Security Badges */}
          <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>SSL Verschlüsselt</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Stripe Secure</span>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <XCircle className="w-5 h-5" />
              <span>Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCheckoutCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verarbeite...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Jetzt bezahlen (CHF {total.toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeCheckout; 