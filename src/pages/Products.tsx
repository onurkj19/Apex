import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Shield, 
  Truck, 
  Star,
  Heart,
  Eye,
  Search,
  Filter,
  Package
} from 'lucide-react';
import StripeCheckout from '@/components/StripeCheckout';
import { supabaseAPI, SupabaseProduct } from '@/services/supabase';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  image: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const Products = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await supabaseAPI.getPublicProducts();
      const mapped: Product[] = (data as SupabaseProduct[]).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        discount: Number(p.discount || 0),
        image: p.image_url,
        createdAt: p.created_at,
        updatedAt: undefined,
      }));
      setProducts(mapped);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Fehler beim Laden der Produkte');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount / 100);
  };

  const animateAddToCart = (imgSrc: string | null) => {
    if (!imgSrc || !cartButtonRef.current) return;
    const cartBtn = cartButtonRef.current;
    const btnRect = cartBtn.getBoundingClientRect();
    const image = document.createElement('img');
    image.src = imgSrc;
    image.style.position = 'fixed';
    image.style.left = `${btnRect.left}px`;
    image.style.top = `${btnRect.top}px`;
    image.style.width = '40px';
    image.style.height = '40px';
    image.style.borderRadius = '8px';
    image.style.objectFit = 'cover';
    image.style.zIndex = '9999';
    image.style.transition = 'transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 600ms';
    document.body.appendChild(image);

    const targetX = btnRect.left + btnRect.width / 2;
    const targetY = btnRect.top + btnRect.height / 2;
    const startX = btnRect.left;
    const startY = btnRect.top - 200; // start a bit above
    image.style.transform = `translate(${startX - targetX}px, ${startY - targetY}px) scale(1)`;

    requestAnimationFrame(() => {
      image.style.transform = `translate(0px, 0px) scale(0.2)`;
      image.style.opacity = '0';
    });

    setTimeout(() => {
      image.remove();
    }, 650);
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
    animateAddToCart(product.image);
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.product.discount > 0 
      ? calculateDiscountedPrice(item.product.price, item.product.discount)
      : item.product.price;
    return total + (price * item.quantity);
  }, 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckoutSuccess = () => {
    setCart([]);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    // Show success message
    console.log('Payment successful!');
  };

  const handleCheckoutCancel = () => {
    setIsCheckoutOpen(false);
    console.log('Checkout cancelled');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16 construction-pattern">
          <div className="container mx-auto px-4">
            <div className="text-center text-white max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Bau-Equipment Store
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Professionelle Ausrüstung für Bauarbeiter - Qualität, Sicherheit und Komfort
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  TÜV-zertifiziert
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Truck className="w-4 h-4 mr-2" />
                  Kostenloser Versand
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Star className="w-4 h-4 mr-2" />
                  4.8/5 Bewertungen
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="py-8 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Produkte suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Cart Button */}
              <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                <DialogTrigger asChild>
                  <Button ref={cartButtonRef} variant="outline" className="relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Warenkorb
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Warenkorb ({cartItemCount} Artikel)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Ihr Warenkorb ist leer
                      </p>
                    ) : (
                      cart.map((item) => (
                        <div key={item.product.id} className="cart-item">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              {item.product.image ? (
                                <img 
                                  src={item.product.image || ''} 
                                  alt={item.product.title} 
                                  className="w-full h-full object-cover rounded-lg" 
                                />
                              ) : (
                                <Package className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{item.product.title}</h4>
                              <p className="text-muted-foreground text-xs">
                                {item.product.discount > 0 
                                  ? `CHF ${calculateDiscountedPrice(item.product.price, item.product.discount).toFixed(2)}`
                                  : `CHF ${item.product.price.toFixed(2)}`
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {cart.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Gesamt:</span>
                        <span className="font-bold text-lg">CHF {cartTotal.toFixed(2)}</span>
                      </div>
                      <Button 
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full"
                        disabled={cart.length === 0}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Zur Kasse
                      </Button>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Produkte werden geladen...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Products Grid */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                      <div className="relative overflow-hidden">
                      <div className="aspect-square bg-muted flex items-center justify-center">
                          {product.image ? (
                            <img 
                              src={product.image}
                              alt={product.title} 
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Package className="h-12 w-12 text-gray-400" />
                          )}
                      </div>
                        {product.discount > 0 && (
                          <Badge className="absolute top-2 left-2 bg-red-500">
                            -{product.discount}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                      <CardTitle className="text-lg mb-2 line-clamp-2">{product.title}</CardTitle>
                    <CardDescription className="text-sm mb-3 line-clamp-2">
                      {product.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                                                    {product.discount > 0 ? (
                            <div>
                              <span className="text-lg font-bold text-green-600">
                                CHF {calculateDiscountedPrice(product.price, product.discount).toFixed(2)}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground line-through">
                                CHF {product.price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              CHF {product.price.toFixed(2)}
                            </span>
                          )}
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(product)}
                        className="w-full"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                          In den Warenkorb
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
            
            
            {!isLoading && !error && filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Produkte verfügbar
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Keine Produkte gefunden. Versuchen Sie andere Suchbegriffe.' : 'Derzeit sind keine Produkte verfügbar.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sicherheit garantiert</h3>
                <p className="text-muted-foreground text-sm">
                  Alle Produkte entsprechen den höchsten Sicherheitsstandards und sind TÜV-zertifiziert.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Kostenloser Versand</h3>
                <p className="text-muted-foreground text-sm">
                  Kostenloser Versand ab CHF 50 Bestellwert. Schnelle Lieferung in die ganze Schweiz.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bewährte Qualität</h3>
                <p className="text-muted-foreground text-sm">
                  Über 10.000 zufriedene Kunden vertrauen auf unsere Produkte und Service.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
      
      {/* Stripe Checkout */}
      <StripeCheckout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart.map(item => ({
          id: parseInt(item.product.id),
          name: item.product.title,
          price: item.product.discount > 0 
            ? calculateDiscountedPrice(item.product.price, item.product.discount)
            : item.product.price,
          quantity: item.quantity,
          image: item.product.image || '',
          description: item.product.description
        }))}
        cartTotal={cartTotal}
        onCheckoutSuccess={handleCheckoutSuccess}
        onCheckoutCancel={handleCheckoutCancel}
      />
    </div>
  );
};

export default Products;
