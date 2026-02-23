import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import soapCollection from "@/assets/products/soap-collection.jpg";

const CartSheet = () => {
  const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    if (!user) {
      navigate("/login?redirect=checkout");
    } else {
      navigate("/client/dashboard?checkout=1");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-accent" />
            Your Cart
            {items.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Browse products and add them here</p>
            </div>
            <Button variant="accent" onClick={() => setIsOpen(false)} asChild>
              <Link to="/#best-sellers">Shop Now</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 items-start">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
                    <img
                      src={product.image_url || soapCollection}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ₵ {product.price.toFixed(2)} / {product.unit}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-bold text-primary">
                      ₵ {(product.price * quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-4 space-y-3 bg-card">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-base">₵ {total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping calculated at checkout
              </p>

              {!user && (
                <p className="text-xs text-accent font-medium bg-accent/10 rounded-lg px-3 py-2">
                  Sign in to complete your order
                </p>
              )}

              <Button variant="accent" className="w-full" size="lg" onClick={handleCheckout}>
                {user ? "Proceed to Checkout" : "Sign In to Checkout"}
              </Button>

              <button
                onClick={clearCart}
                className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors text-center"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
