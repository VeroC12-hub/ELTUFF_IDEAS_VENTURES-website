import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Minus, Plus, Package, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import CartSheet from "@/components/CartSheet";
import logo from "@/assets/logo.png";
import soapCollection from "@/assets/products/soap-collection.jpg";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(id);
  const { addToCart, count, setIsOpen } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      navigate("/login?redirect=/products/" + product.id);
      return;
    }
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src={logo} alt="Ani's Pride" className="h-9" />
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          {product?.categories?.name && (
            <>
              <span>{product.categories.name}</span>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium line-clamp-1">
            {isLoading ? "Loading..." : product?.name}
          </span>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-10">
            <div className="aspect-square rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="space-y-4 pt-4">
              <div className="h-8 bg-secondary/50 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-secondary/50 rounded w-1/4 animate-pulse" />
              <div className="h-4 bg-secondary/50 rounded w-full animate-pulse" />
              <div className="h-4 bg-secondary/50 rounded w-5/6 animate-pulse" />
            </div>
          </div>
        ) : isError || !product ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Product not found</p>
            <Button variant="outline" asChild>
              <Link to="/">Back to Store</Link>
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid md:grid-cols-2 gap-10 lg:gap-16"
          >
            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-secondary/20">
              <img
                src={product.image_url || soapCollection}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.tag && (
                <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full ${
                  product.tag.startsWith("-")
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {product.tag}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-5 py-2">
              {/* Category */}
              {product.categories?.name && (
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  {product.categories.name}
                </span>
              )}

              <h1 className="text-2xl md:text-3xl font-bold leading-snug">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  ₵ {product.price.toFixed(2)}
                </span>
                {product.old_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₵ {product.old_price.toFixed(2)}
                  </span>
                )}
                {product.old_price && (
                  <span className="text-sm font-semibold text-destructive">
                    Save ₵ {(product.old_price - product.price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {product.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Unit: <strong className="text-foreground">{product.unit}</strong>
                </span>
                {product.sku && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    SKU: <strong className="text-foreground">{product.sku}</strong>
                  </span>
                )}
              </div>

              {/* Stock status */}
              {product.stock_quantity <= 0 ? (
                <p className="text-sm font-semibold text-destructive">Out of stock</p>
              ) : product.stock_quantity <= product.min_stock_level ? (
                <p className="text-sm font-semibold text-warning">
                  Low stock — only {product.stock_quantity} {product.unit}s left
                </p>
              ) : (
                <p className="text-sm font-semibold text-success">In stock</p>
              )}

              {/* Quantity + Add to Cart */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-secondary transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 font-medium min-w-[40px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-3 py-2 hover:bg-secondary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity <= 0}
                >
                  {added ? "Added!" : !user ? "Sign In to Order" : "Add to Cart"}
                </Button>
              </div>

              {!user && (
                <p className="text-xs text-muted-foreground">
                  <Link to={`/login?redirect=/products/${product.id}`} className="text-accent hover:underline font-medium">
                    Create an account
                  </Link>{" "}
                  to place orders and track deliveries.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <CartSheet />
    </div>
  );
};

export default ProductDetail;
