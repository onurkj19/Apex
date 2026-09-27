import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { discountedPrice } from '@/lib/shop-api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

const CartDrawer = () => {
  const { items, removeItem, updateQty, total, itemCount, isOpen, closeCart } = useCart();
  const navigate = useNavigate();

  const goCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && closeCart()}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Warenkorb ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
            <ShoppingCart className="h-12 w-12 opacity-30" />
            <p>Ihr Warenkorb ist leer</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y">
              {items.map(({ product, quantity }) => {
                const unitPrice = discountedPrice(product.price, product.discount_percent);
                return (
                  <div key={product.id} className="flex gap-3 p-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-md shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <p className="text-sm text-primary font-semibold mt-0.5">
                        CHF {unitPrice.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(product.id, quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(product.id, quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-semibold">
                        CHF {(unitPrice * quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t p-4 space-y-4">
              <div className="flex justify-between text-base font-semibold">
                <span>Zwischensumme (ohne Versand)</span>
                <span>CHF {total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                * Versandkosten werden an der Kasse berechnet
              </p>
              <Button className="w-full" size="lg" onClick={goCheckout}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Zur Kasse
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
