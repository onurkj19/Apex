import { useState, useEffect } from 'react';
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
  Filter
} from 'lucide-react';
import StripeCheckout from '@/components/StripeCheckout';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  features: string[];
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
  const [selectedCategory, setSelectedCategory] = useState('all');

  const products: Product[] = [
    {
      id: '1',
      name: 'Professionelle Arbeitshose',
      category: 'work-clothes',
      price: 89.99,
      originalPrice: 119.99,
      description: 'Robuste Arbeitshose mit verstärkten Knien und mehreren Taschen für Werkzeuge.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Arbeitshose',
      rating: 4.8,
      reviews: 124,
      inStock: true,
      features: ['Verstärkte Knien', 'Mehrere Taschen', 'Atmungsaktiv', 'Reißfest']
    },
    {
      id: '2',
      name: 'Sicherheitshelm Premium',
      category: 'helmets',
      price: 45.99,
      description: 'TÜV-geprüfter Sicherheitshelm mit integriertem Visier und Belüftung.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Helm',
      rating: 4.9,
      reviews: 89,
      inStock: true,
      features: ['TÜV-geprüft', 'Integriertes Visier', 'Belüftung', 'Leichtgewicht']
    },
    {
      id: '3',
      name: 'Arbeitsschuhe Sicherheit',
      category: 'work-shoes',
      price: 129.99,
      originalPrice: 159.99,
      description: 'Sicherheitsschuhe mit Stahlkappe und rutschfester Sohle für alle Wetterbedingungen.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Schuhe',
      rating: 4.7,
      reviews: 203,
      inStock: true,
      features: ['Stahlkappe', 'Rutschfeste Sohle', 'Wasserdicht', 'Atmungsaktiv']
    },
    {
      id: '4',
      name: 'Hammer Set Professional',
      category: 'tools',
      price: 34.99,
      description: '3-teiliges Hammer Set mit verschiedenen Gewichten für verschiedene Anwendungen.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Hammer',
      rating: 4.6,
      reviews: 67,
      inStock: true,
      features: ['3 verschiedene Gewichte', 'Ergonomischer Griff', 'Hochwertiger Stahl', 'Langlebig']
    },
    {
      id: '5',
      name: 'Werkzeuggürtel',
      category: 'accessories',
      price: 24.99,
      description: 'Praktischer Werkzeuggürtel mit mehreren Taschen und Werkzeughaltern.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Gürtel',
      rating: 4.5,
      reviews: 156,
      inStock: true,
      features: ['Mehrere Taschen', 'Verstellbar', 'Robust', 'Leichtgewicht']
    },
    {
      id: '6',
      name: 'Sicherheitsbrille',
      category: 'accessories',
      price: 19.99,
      description: 'Kratzfeste Sicherheitsbrille mit UV-Schutz für alle Arbeiten.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Brille',
      rating: 4.4,
      reviews: 98,
      inStock: true,
      features: ['Kratzfest', 'UV-Schutz', 'Leichtgewicht', 'Verstellbar']
    },
    {
      id: '7',
      name: 'Arbeitsjacke Winter',
      category: 'work-clothes',
      price: 149.99,
      description: 'Warme Arbeitsjacke mit reflektierenden Streifen für Sichtbarkeit.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Jacke',
      rating: 4.8,
      reviews: 73,
      inStock: true,
      features: ['Warm', 'Reflektierende Streifen', 'Wasserdicht', 'Atmungsaktiv']
    },
    {
      id: '8',
      name: 'Schraubendreher Set',
      category: 'tools',
      price: 29.99,
      description: '12-teiliges Schraubendreher Set mit verschiedenen Größen und Spitzen.',
      image: 'https://via.placeholder.com/300x300/374151/FFFFFF?text=Schraubendreher',
      rating: 4.7,
      reviews: 112,
      inStock: true,
      features: ['12 verschiedene Größen', 'Ergonomische Griffe', 'Hochwertiger Stahl', 'Langlebig']
    }
  ];

  const categories = [
    { id: 'all', name: 'Alle Produkte' },
    { id: 'work-clothes', name: 'Arbeitskleidung' },
    { id: 'helmets', name: 'Helme' },
    { id: 'work-shoes', name: 'Arbeitsschuhe' },
    { id: 'tools', name: 'Werkzeuge' },
    { id: 'accessories', name: 'Zubehör' }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
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

        {/* Search and Filter Section */}
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
              
              <div className="flex gap-2">
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="grid grid-cols-3 md:grid-cols-6">
                    {categories.map((category) => (
                      <TabsTrigger key={category.id} value={category.id} className="text-xs md:text-sm">
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Cart Button */}
              <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="relative">
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
                              <img src={item.product.image} alt={item.product.name} className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{item.product.name}</h4>
                              <p className="text-muted-foreground text-xs">
                                {item.product.price.toFixed(2)} €
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
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="card-elegant group">
                  <CardHeader className="p-0">
                    <div className="relative overflow-hidden rounded-t-xl">
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                      {product.originalPrice && (
                        <Badge className="absolute top-2 left-2 bg-destructive">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {categories.find(c => c.id === product.category)?.name}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span className="text-xs">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                      </div>
                    </div>
                    
                    <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                    <CardDescription className="text-sm mb-3 line-clamp-2">
                      {product.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          CHF {product.price.toFixed(2)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            CHF {product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(product)}
                        className="w-full"
                        disabled={!product.inStock}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {product.inStock ? 'In den Warenkorb' : 'Nicht verfügbar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Keine Produkte gefunden. Versuchen Sie andere Suchbegriffe.
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
                  Kostenloser Versand ab 50€ Bestellwert. Schnelle Lieferung in ganz Deutschland.
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
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.image,
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
