import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useProductsPaginated, useProductBySku, useCreateProduct, useUpdateProduct, Product } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import retailNavGroups from "@/lib/retailNavGroups";
import { ExternalLink, Barcode, Pencil, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

type FormData = {
  name: string; sku: string; size: string; cost_price: string;
  price_retail: string; price_wholesale: string;
  stock_quantity: string; unit: string;
};

const emptyForm: FormData = {
  name: "", sku: "", size: "", cost_price: "",
  price_retail: "", price_wholesale: "",
  stock_quantity: "0", unit: "unit",
};

export default function RetailProductsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const lookupBySku = useProductBySku();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [scan, setScan] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const scanRef = useRef<HTMLInputElement>(null);

  // Debounce search so we don't fire a query on every keystroke, and reset to
  // page 0 whenever the search term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useProductsPaginated(page, PAGE_SIZE, debouncedSearch);
  const filtered = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Catches a barcode scan no matter where focus is on the page (a scanner just
  // types fast + Enter), and redirects it into the scan field automatically.
  useEffect(() => {
    if (dialog !== null) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typingElsewhere = (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && target !== scanRef.current;
      if (typingElsewhere) return;
      if (document.activeElement !== scanRef.current && e.key.length === 1) {
        scanRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog]);

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      size: (p as any).size ?? "",
      cost_price: (p as any).cost_price != null ? String((p as any).cost_price) : "",
      price_retail: (p as any).price_retail != null ? String((p as any).price_retail) : String(p.price),
      price_wholesale: (p as any).price_wholesale != null ? String((p as any).price_wholesale) : "",
      stock_quantity: String(p.stock_quantity),
      unit: p.unit,
    });
    setDialog("edit");
  };

  const openCreate = (sku: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, sku });
    setDialog("create");
  };

  const handleScanKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = scan.trim();
    if (!code) return;
    try {
      const match = await lookupBySku(code);
      if (match) {
        openEdit(match);
      } else {
        openCreate(code);
      }
    } catch {
      toast({ title: "Lookup failed", description: "Check your connection and try again.", variant: "destructive" });
    }
    setScan("");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price_retail) {
      toast({ title: "Name and retail price are required", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(),
      sku: form.sku || null,
      size: form.size || null,
      price: parseFloat(form.price_retail),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      price_retail: parseFloat(form.price_retail),
      price_wholesale: form.price_wholesale ? parseFloat(form.price_wholesale) : null,
      stock_quantity: parseFloat(form.stock_quantity) || 0,
      unit: form.unit || "unit",
    } as any;
    try {
      if (dialog === "create") {
        await createProduct.mutateAsync({ ...payload, created_by: user?.id });
        toast({ title: "Product added" });
      } else if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Prices updated" });
      }
      setDialog(null);
      scanRef.current?.focus();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Price List</h1>
            <p className="text-muted-foreground text-sm">Cost, retail and wholesale prices for every product</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="accent" onClick={() => openCreate("")}>
              <Plus className="h-4 w-4 mr-1" /> New Item
            </Button>
            <Link to="/staff/products" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Manage in Production <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={scanRef}
              autoFocus
              placeholder="Scan a barcode to add or update its price…"
              value={scan}
              onChange={e => setScan(e.target.value)}
              onKeyDown={handleScanKeyDown}
              className="pl-9"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cost Price</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Retail Price</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Wholesale Price</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Margin (Retail)</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Stock</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                ) : filtered.map(p => {
                  const cost = (p as any).cost_price as number | null;
                  const retail = ((p as any).price_retail as number | null) ?? p.price;
                  const wholesale = (p as any).price_wholesale as number | null;
                  const margin = cost != null && retail > 0 ? ((retail - cost) / retail) * 100 : null;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-medium">{p.name}{(p as any).size ? ` (${(p as any).size})` : ""}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground">{cost != null ? `₵ ${cost.toFixed(2)}` : "—"}</td>
                      <td className="p-3 font-semibold">₵ {retail.toFixed(2)}</td>
                      <td className="p-3">{wholesale != null ? `₵ ${wholesale.toFixed(2)}` : "—"}</td>
                      <td className="p-3">
                        {margin != null ? (
                          <span className={margin < 15 ? "text-destructive font-semibold" : "text-success font-medium"}>
                            {margin.toFixed(0)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3">
                        <span className={p.stock_quantity <= p.min_stock_level ? "text-destructive font-semibold" : ""}>
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-3 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages} · {total} products
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "New Product" : "Update Price"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-1">
              <Label>SKU / Barcode</Label>
              <Input value={form.sku} onChange={e => set("sku", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Size / Variant</Label>
              <Input value={form.size} onChange={e => set("size", e.target.value)} placeholder="e.g. 250ml, 500g, 1L" />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. unit, kg, L" />
            </div>
            <div className="space-y-1">
              <Label>Cost Price (₵)</Label>
              <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => set("cost_price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Retail Price (₵) *</Label>
              <Input type="number" min="0" step="0.01" value={form.price_retail} onChange={e => set("price_retail", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Wholesale Price (₵)</Label>
              <Input type="number" min="0" step="0.01" value={form.price_wholesale} onChange={e => set("price_wholesale", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
              {createProduct.isPending || updateProduct.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
