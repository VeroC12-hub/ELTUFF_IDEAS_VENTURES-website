import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useProductSearch, useProductBySku, Product } from "@/hooks/useProducts";
import { useAdjustStock } from "@/hooks/useInventory";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { Barcode, Minus, Plus, Trash2, ShoppingBag, PauseCircle, PlayCircle, X } from "lucide-react";
import retailNavGroups from "@/lib/retailNavGroups";
import { printReceipt } from "@/lib/printReceipt";

type Tier = "retail" | "wholesale";

interface SaleItem {
  product: Product;
  quantity: number;
}

interface HeldSale {
  id: string;
  heldAt: string;
  items: SaleItem[];
  tier: Tier;
  customerName: string;
  paymentMethod: string;
  paymentReference: string;
  discount: string;
}

const HELD_SALES_KEY = "eltuff_held_sales";

const unitPrice = (product: Product, tier: Tier) => {
  const tiered = tier === "retail" ? (product as any).price_retail : (product as any).price_wholesale;
  return tiered != null ? tiered : product.price;
};

export default function RetailSalePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const createInvoice = useCreateInvoice();
  const adjustStock = useAdjustStock();
  const lookupBySku = useProductBySku();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [tier, setTier] = useState<Tier>("retail");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [completing, setCompleting] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => {
    try { return JSON.parse(localStorage.getItem(HELD_SALES_KEY) ?? "[]"); }
    catch { return []; }
  });
  const [showHeld, setShowHeld] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(heldSales));
  }, [heldSales]);

  // Debounce so manual typing doesn't fire a search request per keystroke —
  // a barcode scan's rapid input + Enter isn't affected since the exact-match
  // lookup on Enter queries fresh, independent of this.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { data: matches = [] } = useProductSearch(debouncedQuery);

  // Catches a barcode scan no matter where focus is on the page (a scanner just
  // types fast + Enter), and redirects it into the scan field automatically.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typingElsewhere = (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && target !== inputRef.current;
      if (typingElsewhere) return;
      if (document.activeElement !== inputRef.current && e.key.length === 1) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addProduct = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setQuery("");
    inputRef.current?.focus();
  };

  const handleQueryKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = query.trim();
    if (!q) return;
    try {
      const exact = await lookupBySku(q);
      if (exact) {
        addProduct(exact);
      } else {
        toast({ title: "Product not found", description: "Add it from Products on the Production side first.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Lookup failed", description: "Check your connection and try again.", variant: "destructive" });
    }
  };

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
      return;
    }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.product.id !== productId));

  const clearActiveSale = () => {
    setItems([]);
    setCustomerName("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setDiscount("");
    setTier("retail");
  };

  const handleHoldSale = () => {
    if (items.length === 0) {
      toast({ title: "Nothing to hold", description: "Add items to the sale first.", variant: "destructive" });
      return;
    }
    setHeldSales(prev => [...prev, {
      id: crypto.randomUUID(),
      heldAt: new Date().toISOString(),
      items, tier, customerName, paymentMethod, paymentReference, discount,
    }]);
    clearActiveSale();
    toast({ title: "Sale held", description: "Come back to it anytime from Held Sales." });
    inputRef.current?.focus();
  };

  const handleResumeSale = (held: HeldSale) => {
    if (items.length > 0) {
      // Don't lose whatever's currently on the counter — park it too.
      setHeldSales(prev => [...prev.filter(h => h.id !== held.id), {
        id: crypto.randomUUID(),
        heldAt: new Date().toISOString(),
        items, tier, customerName, paymentMethod, paymentReference, discount,
      }]);
    } else {
      setHeldSales(prev => prev.filter(h => h.id !== held.id));
    }
    setItems(held.items);
    setTier(held.tier);
    setCustomerName(held.customerName);
    setPaymentMethod(held.paymentMethod);
    setPaymentReference(held.paymentReference);
    setDiscount(held.discount);
    setShowHeld(false);
    inputRef.current?.focus();
  };

  const handleDiscardHeldSale = (id: string) => {
    setHeldSales(prev => prev.filter(h => h.id !== id));
  };

  const subtotal = items.reduce((sum, i) => sum + unitPrice(i.product, tier) * i.quantity, 0);
  const discountPercent = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const discountValue = subtotal * (discountPercent / 100);
  const total = subtotal - discountValue;

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast({ title: "Add at least one item first", variant: "destructive" });
      return;
    }
    if (paymentMethod !== "cash" && !paymentReference.trim()) {
      toast({ title: "Reference number required", description: "Enter the Mobile Money / card transaction reference.", variant: "destructive" });
      return;
    }
    setCompleting(true);
    try {
      const receiptItems = items.map(i => ({
        description: i.product.name + ((i.product as any).size ? ` (${(i.product as any).size})` : ""),
        quantity: i.quantity,
        unit_price: unitPrice(i.product, tier),
        total_price: unitPrice(i.product, tier) * i.quantity,
        product_id: i.product.id,
      }));
      if (discountValue > 0) {
        receiptItems.push({
          description: `Discount (${discountPercent}%)`,
          quantity: 1,
          unit_price: -discountValue,
          total_price: -discountValue,
        } as typeof receiptItems[number]);
      }
      const billingName = customerName.trim() || "Walk-in Customer";

      const reference = paymentMethod !== "cash" ? paymentReference.trim() : "";
      const receipt = await createInvoice.mutateAsync({
        items: receiptItems,
        billingName,
        notes: `Retail sale — ${tier}${reference ? ` | Ref: ${reference}` : ""}`,
        channel: "retail",
        paymentMethod,
        status: "paid",
        soldBy: user?.id,
      });

      for (const i of items) {
        await adjustStock.mutateAsync({
          productId: i.product.id,
          changeAmount: -i.quantity,
          currentStock: i.product.stock_quantity,
          reason: "Retail sale",
          operatedBy: user?.id ?? "",
        });
      }

      toast({ title: "Sale completed", description: `Receipt ${receipt.invoice_number}` });
      printReceipt({
        invoice_number: receipt.invoice_number,
        created_at: receipt.created_at,
        total_amount: receipt.total_amount,
        billing_name: billingName,
        payment_method: paymentMethod,
        payment_reference: reference || undefined,
        invoice_items: receiptItems,
      });
      clearActiveSale();
      inputRef.current?.focus();
    } catch (e: unknown) {
      toast({ title: "Sale failed", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">New Sale</h1>
            <p className="text-muted-foreground text-sm">Scan a barcode or search by name/SKU to ring up a sale</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowHeld(true)} className="relative">
              <PauseCircle className="h-4 w-4 mr-1" /> Held Sales
              {heldSales.length > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                  {heldSales.length}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={handleHoldSale} disabled={items.length === 0}>
              <PauseCircle className="h-4 w-4 mr-1" /> Hold This Sale
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <Label>Scan barcode or search product</Label>
              </div>
              <div className="relative">
                <Input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleQueryKeyDown}
                  placeholder="Scan a barcode, or type a product name / SKU…"
                />
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {matches.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <span>
                          <span className="font-medium">{p.name}</span>
                          {p.sku && <span className="text-xs text-muted-foreground ml-2">{p.sku}</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">₵ {unitPrice(p, tier).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No items yet — scan or search above</td></tr>
                  ) : items.map(i => (
                    <tr key={i.product.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{i.product.name}</td>
                      <td className="p-3 text-muted-foreground">₵ {unitPrice(i.product, tier).toFixed(2)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(i.product.id, i.quantity - 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center">{i.quantity}</span>
                          <button onClick={() => updateQty(i.product.id, i.quantity + 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-secondary">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold">₵ {(unitPrice(i.product, tier) * i.quantity).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => removeItem(i.product.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="space-y-1">
                <Label>Pricing</Label>
                <Select value={tier} onValueChange={v => setTier(v as Tier)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Customer (optional)</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="momo">Mobile Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod !== "cash" && (
                <div className="space-y-1">
                  <Label>{paymentMethod === "momo" ? "Mobile Money" : "Card"} Reference *</Label>
                  <Input
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder={paymentMethod === "momo" ? "Transaction ID from customer's SMS" : "Card terminal reference"}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Discount (%)</Label>
                <Input type="number" min="0" max="100" step="1" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Items</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              {discountValue > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₵ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-destructive">
                    <span>Discount ({discountPercent}%)</span>
                    <span>- ₵ {discountValue.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>₵ {total.toFixed(2)}</span>
              </div>
              <Button variant="accent" className="w-full" size="lg" onClick={handleCompleteSale} disabled={completing || items.length === 0}>
                <ShoppingBag className="h-4 w-4 mr-1" />
                {completing ? "Processing…" : "Complete Sale"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent>
          <DialogHeader><DialogTitle>Held Sales</DialogTitle></DialogHeader>
          {heldSales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No sales on hold right now.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {heldSales.map(h => {
                const hTotal = h.items.reduce((s, i) => s + unitPrice(i.product, h.tier) * i.quantity, 0);
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{h.customerName || "Walk-in Customer"}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.items.reduce((s, i) => s + i.quantity, 0)} items · ₵ {hTotal.toFixed(2)} · held {new Date(h.heldAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="accent" onClick={() => handleResumeSale(h)}>
                        <PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume
                      </Button>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleDiscardHeldSale(h.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
