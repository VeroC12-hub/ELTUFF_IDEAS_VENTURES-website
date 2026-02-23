import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search, ShoppingCart, Phone, Mail, MapPin, ArrowRight, Star, Truck, Shield, Clock, ChevronRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useStorefrontCategories, useStorefrontProducts, Product } from "@/hooks/useProducts";
import CartSheet from "@/components/CartSheet";
import logo from "@/assets/logo.png";
import heroBanner from "@/assets/hero-banner.jpg";
import soapCollection from "@/assets/products/soap-collection.jpg";
import moisturizer from "@/assets/products/moisturizer.jpg";
import cleaner from "@/assets/products/cleaner.jpg";
import detergent from "@/assets/products/detergent.jpg";
import sanitizer from "@/assets/products/sanitizer.jpg";

// Fallback images per category name (used when DB has no image_url set yet)
const categoryFallbacks: Record<string, string> = {
  "Cosmetics": moisturizer,
  "Household Chemicals": cleaner,
  "Industrial": detergent,
  "Personal Care": sanitizer,
  "Hair Care": soapCollection,
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const }
  }),
};

const ProductCardSkeleton = () => (
  <div className="group animate-pulse">
    <div className="bg-secondary/50 rounded-xl aspect-square mb-3" />
    <div className="h-4 bg-secondary/50 rounded w-3/4 mb-2" />
    <div className="h-4 bg-secondary/50 rounded w-1/3" />
  </div>
);

const ProductCard = ({ product, index, onAddToCart }: {
  product: Product;
  index: number;
  onAddToCart: (p: Product) => void;
}) => (
  <motion.div variants={fadeUp} custom={index} className="group flex flex-col">
    <Link to={`/products/${product.id}`} className="flex-1">
      <div className="relative bg-secondary/30 rounded-xl overflow-hidden aspect-square mb-3">
        <img
          src={product.image_url || soapCollection}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {product.tag && (
          <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            product.tag.startsWith("-")
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}>
            {product.tag}
          </span>
        )}
        {/* Quick-add button on hover */}
        <button
          onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
          className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110 active:scale-95"
          aria-label="Add to cart"
        >
          <ShoppingBag className="h-4 w-4" />
        </button>
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
      </div>
      <h3 className="font-sans text-sm font-medium leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {product.name}
      </h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-primary">₵ {product.price.toFixed(2)}</span>
        {product.old_price && (
          <span className="text-xs text-muted-foreground line-through">₵ {product.old_price.toFixed(2)}</span>
        )}
      </div>
    </Link>
    <button
      onClick={() => onAddToCart(product)}
      className="w-full text-xs font-semibold py-1.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
    >
      Add to Cart
    </button>
  </motion.div>
);

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { count, setIsOpen, addToCart } = useCart();
  const { data: dbCategories = [], isLoading: catsLoading } = useStorefrontCategories();
  const { data: newArrivals = [], isLoading: newLoading } = useStorefrontProducts("new_arrivals");
  const { data: bestSellers = [], isLoading: bestLoading } = useStorefrontProducts("best_sellers");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground text-xs py-2">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-4">
            <a href="tel:0555344377" className="flex items-center gap-1 hover:text-accent transition-colors">
              <Phone className="h-3 w-3" /> 0555344377
            </a>
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" /> info@eltuffideas.com
            </span>
          </div>
          <p className="text-center flex-1 sm:flex-none">
            🎉 Free delivery on orders over ₵ 500!
          </p>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to="/" className="shrink-0">
              <img src={logo} alt="Ani's Pride by Antuff" className="h-12" />
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <Input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-secondary/50 border-border"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Login / Register</Link>
              </Button>
              {/* Cart icon with badge */}
              <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCart className="h-5 w-5 text-foreground" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
              <Button variant="accent" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Category Nav */}
        <div className="border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-6 h-10 overflow-x-auto text-sm">
              <a href="#new-arrivals" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors font-medium">New Arrivals</a>
              <a href="#best-sellers" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">Best Sellers</a>
              <a href="#categories" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">Cosmetics</a>
              <a href="#categories" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">Household Chemicals</a>
              <a href="#categories" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">Industrial</a>
              <a href="#contact" className="text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">Contact Us</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        <div className="relative h-[400px] md:h-[500px]">
          <img src={heroBanner} alt="Ani's Pride Premium Products" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-lg"
              >
                <span className="inline-block text-accent font-semibold text-sm mb-2 uppercase tracking-wider">
                  Ani's Pride by Antuff
                </span>
                <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground leading-tight mb-4">
                  Premium Cosmetics & Household Solutions
                </h1>
                <p className="text-primary-foreground/80 text-base mb-6">
                  Discover our range of high-quality beauty products and household chemicals. Made with care, delivered with pride.
                </p>
                <div className="flex gap-3">
                  <Button variant="accent" size="lg" asChild>
                    <a href="#best-sellers">Shop Now <ArrowRight className="ml-1 h-4 w-4" /></a>
                  </Button>
                  <Button variant="heroOutline" size="lg" asChild>
                    <a href="#categories">View Categories</a>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Banner */}
      <section className="py-10 text-center bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            Welcome to Ani's Pride by Antuff!
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-4">
            Your one-stop shop for premium cosmetics and household chemical products. Quality you can trust.
          </p>
          <Button variant="outline" asChild>
            <a href="#best-sellers" className="gap-1">
              VIEW ALL PRODUCTS <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Shop by Category */}
      <section id="categories" className="py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <a href="#best-sellers" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
          {catsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl aspect-[4/3] bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : dbCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No categories yet — add some from the staff dashboard.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dbCategories.map((cat, i) => {
                const imgSrc = cat.image_url || categoryFallbacks[cat.name] || cleaner;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer"
                  >
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-primary-foreground font-sans font-semibold text-sm">{cat.name}</h3>
                      <p className="text-primary-foreground/70 text-xs">{cat.product_count ?? 0} Products</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section id="new-arrivals" className="py-14 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">✨ New Arrivals</h2>
          </div>
          {newLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : newArrivals.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No new arrivals yet — staff can add products from the dashboard.
            </p>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-5"
            >
              {newArrivals.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onAddToCart={addToCart} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="gradient-primary rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
                Bulk Orders? Get Special Pricing!
              </h2>
              <p className="text-primary-foreground/70 max-w-md">
                We supply cosmetics and household chemicals in bulk for businesses. Contact us for wholesale pricing.
              </p>
            </div>
            <Button variant="accent" size="lg" asChild className="shrink-0">
              <Link to="/login">Contact Sales <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section id="best-sellers" className="py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">🔥 Best Sellers</h2>
            <Link to="/login" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {bestLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : bestSellers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No best sellers yet — staff can mark products from the dashboard.
            </p>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
            >
              {bestSellers.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} onAddToCart={addToCart} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-secondary/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: "Fast Delivery", desc: "Nationwide shipping" },
              { icon: Shield, title: "Quality Assured", desc: "Certified products" },
              { icon: Clock, title: "24/7 Support", desc: "Always here to help" },
              { icon: Star, title: "Trusted Brand", desc: "1000+ happy customers" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-sans font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-primary text-primary-foreground pt-12 pb-6">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={logo} alt="Ani's Pride" className="h-14 brightness-0 invert mb-4" />
              <p className="text-primary-foreground/60 text-sm">
                Eltuff Ideas Ventures — Manufacturing and supplying premium cosmetics and household chemicals.
              </p>
            </div>
            <div>
              <h4 className="font-sans font-semibold mb-3 text-sm">Quick Links</h4>
              <div className="space-y-2 text-sm text-primary-foreground/60">
                <a href="#categories" className="block hover:text-accent transition-colors">Shop by Category</a>
                <a href="#new-arrivals" className="block hover:text-accent transition-colors">New Arrivals</a>
                <a href="#best-sellers" className="block hover:text-accent transition-colors">Best Sellers</a>
                <Link to="/login" className="block hover:text-accent transition-colors">My Account</Link>
              </div>
            </div>
            <div>
              <h4 className="font-sans font-semibold mb-3 text-sm">Categories</h4>
              <div className="space-y-2 text-sm text-primary-foreground/60">
                <a href="#categories" className="block hover:text-accent transition-colors">Cosmetics</a>
                <a href="#categories" className="block hover:text-accent transition-colors">Household Chemicals</a>
                <a href="#categories" className="block hover:text-accent transition-colors">Industrial</a>
              </div>
            </div>
            <div>
              <h4 className="font-sans font-semibold mb-3 text-sm">Contact Us</h4>
              <div className="space-y-2 text-sm text-primary-foreground/60">
                <a href="tel:0555344377" className="flex items-center gap-2 hover:text-accent transition-colors">
                  <Phone className="h-3.5 w-3.5" /> 0555344377
                </a>
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> info@eltuffideas.com
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> Accra, Ghana
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
            © 2026 Eltuff Ideas Ventures. All rights reserved. Powered by Ani's Pride by Antuff.
          </div>
        </div>
      </footer>

      {/* Cart sidebar — rendered here so it's always available on the storefront */}
      <CartSheet />
    </div>
  );
};

export default Index;
