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
import { ShoppingCart, Package, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';

// ─── Product Detail Modal ─────────────────────────────────────────────────────

const ProductModal = ({ product, onClose }: { product: ShopProduct; onClose: () => void }) => {
  const { addItem } = useCart();
  const finalPrice = discountedPrice(product.price, product.discount_percent);
  const hasDiscount = product.discount_percent > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
    toast.success(`"${product.title}" wurde zum Warenkorb hinzugefügt!`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="relative bg-muted aspect-square md:aspect-auto min-h-[300px]">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-20 w-20 text-muted-foreground/30" />
              </div>
            )}
            {hasDiscount && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white border-0 text-sm px-3 py-1">
                -{product.discount_percent}% Rabatt
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-6 gap-4">
            {product.category && (
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                {product.category}
              </span>
            )}
            <h2 className="text-2xl font-bold leading-snug">{product.title}</h2>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-primary">CHF {finalPrice.toFixed(2)}</span>
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  CHF {product.price.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {product.in_stock ? 'Auf Lager – sofort lieferbar' : 'Nicht verfügbar'}
              </span>
            </div>

            <div className="mt-auto pt-4 space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleAdd}
                disabled={!product.in_stock}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.in_stock ? 'In den Warenkorb' : 'Nicht verfügbar'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Versand per Swiss Post • Rechnung liegt bei
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────

const ProductCard = ({ product, onOpen }: { product: ShopProduct; onOpen: () => void }) => {
  const { addItem } = useCart();
  const finalPrice = discountedPrice(product.price, product.discount_percent);
  const hasDiscount = product.discount_percent > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
    toast.success(`"${product.title}" wurde zum Warenkorb hinzugefügt!`);
  };

  return (
    <div
      className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={onOpen}
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
        {/* Zoom hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
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

const Products = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const { itemCount, openCart } = useCart();

  useEffect(() => {
    shopProductsApi.listPublic()
      .then(setProducts)
      .catch(() => toast.error('Nuk u ngarkuan produktet.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))];
  const filtered = category === 'all' ? products : products.filter((p) => p.category === category);

  return (
    <div className="min-h-screen w-full min-w-0 bg-background">
      <Header />
      <CartDrawer />

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

            {/* Cart button */}
            {itemCount > 0 && (
              <Button size="lg" onClick={openCart} className="mx-auto">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Warenkorb ({itemCount})
              </Button>
            )}
          </div>
        </section>

        {/* Filters */}
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

        {/* Products grid */}
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
                <ProductCard key={product.id} product={product} onOpen={() => setSelectedProduct(product)} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <BackToTop />

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
};

export default Products;
