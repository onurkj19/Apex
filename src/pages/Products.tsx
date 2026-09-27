import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import CartDrawer from '@/components/shop/CartDrawer';
import { shopProductsApi, discountedPrice } from '@/lib/shop-api';
import type { ShopProduct } from '@/lib/shop-api';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShoppingCart, Package, X, Tag, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ─── Product Detail Modal ────────────────────────────────────────────────────
const ProductModal = ({
  product,
  onClose,
}: {
  product: ShopProduct;
  onClose: () => void;
}) => {
  const { addItem } = useCart();
  const finalPrice = discountedPrice(product.price, product.discount_percent);
  const hasDiscount = product.discount_percent > 0;
  const savedAmount = product.price - finalPrice;

  const handleAdd = () => {
    addItem(product);
    toast.success('In den Warenkorb hinzugefügt ✓', {
      description: product.title,
      duration: 2000,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="relative bg-muted min-h-64 md:min-h-96 flex items-center justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-contain max-h-96 p-4"
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/30" />
            )}
            {hasDiscount && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white border-0 text-sm px-3 py-1">
                -{product.discount_percent}% Rabatt
              </Badge>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full bg-background/80 p-1.5 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Info */}
          <div className="p-6 md:p-8 flex flex-col gap-4">
            {product.category && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest">
                <Layers className="h-3.5 w-3.5" />
                {product.category}
              </div>
            )}

            <h2 className="text-2xl font-bold leading-snug">{product.title}</h2>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Price block */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  CHF {finalPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    CHF {product.price.toFixed(2)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-1.5 text-sm text-green-500 font-medium">
                  <Tag className="h-3.5 w-3.5" />
                  Sie sparen CHF {savedAmount.toFixed(2)} ({product.discount_percent}%)
                </div>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-sm text-muted-foreground">
                {product.in_stock ? 'Auf Lager — sofort verfügbar' : 'Derzeit nicht auf Lager'}
              </span>
            </div>

            <div className="mt-auto space-y-3 pt-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAdd}
                disabled={!product.in_stock}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.in_stock ? 'In den Warenkorb' : 'Nicht verfügbar'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Zahlung per Rechnung · Versand per Swiss Post
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Product Card ────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onOpenDetail,
}: {
  product: ShopProduct;
  onOpenDetail: (p: ShopProduct) => void;
}) => {
  const { addItem } = useCart();
  const finalPrice = discountedPrice(product.price, product.discount_percent);
  const hasDiscount = product.discount_percent > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
    toast.success('In den Warenkorb hinzugefügt ✓', {
      description: product.title,
      duration: 2000,
    });
  };

  return (
    <div
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={() => onOpenDetail(product)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {hasDiscount && (
          <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0">
            -{product.discount_percent}%
          </Badge>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm">Nicht verfügbar</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {product.category && (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</span>
        )}
        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{product.title}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary">CHF {finalPrice.toFixed(2)}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                CHF {product.price.toFixed(2)}
              </span>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleAdd}
            disabled={!product.in_stock}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {product.in_stock ? 'In den Warenkorb' : 'Nicht verfügbar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const Products = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const { itemCount, openCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    shopProductsApi.listPublic()
      .then(setProducts)
      .catch(() => toast.error('Produkte konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    'all',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])),
  ];
  const filtered = category === 'all' ? products : products.filter((p) => p.category === category);

  return (
    <div className="min-h-screen w-full min-w-0 bg-background">
      <Header />
      <CartDrawer />

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <main>
        {/* Hero */}
        <section className="pt-28 pb-12 bg-gradient-to-b from-muted/40 to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Unser <span className="text-gradient">Online-Shop</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Qualitätsprodukte für Ihren Bedarf — direkte Lieferung zu Ihnen.
            </p>

            {itemCount > 0 && (
              <Button size="lg" onClick={openCart} className="mx-auto">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Warenkorb ({itemCount})
              </Button>
            )}
          </div>
        </section>

        {/* Category filters */}
        {categories.length > 1 && (
          <section className="container mx-auto px-4 mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                >
                  {cat === 'all' ? 'Alle' : cat}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Grid */}
        <section className="container mx-auto px-4 pb-20">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Derzeit keine Produkte verfügbar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <BackToTop />

      {/* Floating cart button */}
      {itemCount > 0 && (
        <button
          onClick={() => navigate('/checkout')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 font-semibold"
          aria-label="Zur Kasse"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2.5 -right-2.5 min-w-5 h-5 px-1 rounded-full bg-white text-primary text-[11px] font-bold flex items-center justify-center leading-none">
              {itemCount}
            </span>
          </div>
          <span>Zur Kasse</span>
        </button>
      )}
    </div>
  );
};

export default Products;
