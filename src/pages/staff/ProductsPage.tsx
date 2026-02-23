import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAllProducts, useAllCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, LayoutDashboard, Package, Warehouse, Users, Receipt, ShoppingCart, ClipboardList, BarChart3, Settings, UserPlus, CreditCard } from "lucide-react";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Finance", items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System", items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const SECTIONS = [
  { value: "none", label: "Not on storefront" },
  { value: "new_arrivals", label: "New Arrivals" },
  { value: "best_sellers", label: "Best Sellers" },
];

type FormData = {
  name: string; description: string; price: string; old_price: string;
  unit: string; sku: string; category_id: string; stock_quantity: string;
  min_stock_level: string; image_url: string; tag: string;
  storefront_section: string; is_active: boolean;
};

const empty: FormData = {
  name: "", description: "", price: "", old_price: "", unit: "unit",
  sku: "", category_id: "", stock_quantity: "0", min_stock_level: "0",
  image_url: "", tag: "", storefront_section: "none", is_active: true,
};

export default function ProductsPage() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { data: products = [], isLoading } = useAllProducts();
  const { data: categories = [] } = useAllCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(empty); setEditing(null); setDialog("create"); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", price: String(p.price),
      old_price: p.old_price ? String(p.old_price) : "", unit: p.unit,
      sku: p.sku ?? "", category_id: p.category_id ?? "",
      stock_quantity: String(p.stock_quantity), min_stock_level: String(p.min_stock_level),
      image_url: p.image_url ?? "", tag: p.tag ?? "",
      storefront_section: p.storefront_section ?? "none", is_active: p.is_active,
    });
    setDialog("edit");
  };

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(), description: form.description,
      price: parseFloat(form.price), old_price: form.old_price ? parseFloat(form.old_price) : null,
      unit: form.unit, sku: form.sku || null,
      category_id: form.category_id || null,
      stock_quantity: parseFloat(form.stock_quantity) || 0,
      min_stock_level: parseFloat(form.min_stock_level) || 0,
      image_url: form.image_url || null, tag: form.tag || null,
      storefront_section: form.storefront_section === "none" ? null : form.storefront_section,
      is_active: form.is_active,
    };
    try {
      if (dialog === "create") {
        await createProduct.mutateAsync({ ...payload, created_by: user?.id });
        toast({ title: "Product created" });
      } else if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Product updated" });
      }
      setDialog(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct.mutateAsync(deleting.id);
      toast({ title: "Product deleted" });
      setDeleting(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await updateProduct.mutateAsync({ id: p.id, is_active: !p.is_active });
      toast({ title: p.is_active ? "Product hidden" : "Product activated" });
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Products</h1>
            <p className="text-muted-foreground text-sm">{products.length} total products</p>
          </div>
          <Button variant="accent" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
        </div>

        <Input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tag</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Active</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image_url && <img src={p.image_url} alt="" className="h-9 w-9 rounded-lg object-cover bg-secondary/50" />}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{(p as Product & { categories?: { name: string } | null }).categories?.name ?? "—"}</td>
                    <td className="p-3 font-medium">₵ {p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={p.stock_quantity <= p.min_stock_level ? "text-destructive font-semibold" : ""}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                        {p.storefront_section?.replace("_", " ") ?? "—"}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{p.tag ?? "—"}</td>
                    <td className="p-3">
                      <button onClick={() => toggleActive(p)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {p.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        {role === "admin" && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(p)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialog !== null} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Product name" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Product description…" />
            </div>
            <div className="space-y-1">
              <Label>Price (₵) *</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Old Price (₵) — for sale badge</Label>
              <Input type="number" min="0" step="0.01" value={form.old_price} onChange={e => set("old_price", e.target.value)} placeholder="Leave blank if no discount" />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. unit, kg, L" />
            </div>
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Stock keeping unit" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => set("category_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Storefront Section</Label>
              <Select value={form.storefront_section} onValueChange={v => set("storefront_section", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tag Badge</Label>
              <Input value={form.tag} onChange={e => set("tag", e.target.value)} placeholder="e.g. New, Best Seller, -20%" />
            </div>
            <div className="space-y-1">
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Min Stock Level</Label>
              <Input type="number" min="0" value={form.min_stock_level} onChange={e => set("min_stock_level", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://…" />
              {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 h-24 w-24 rounded-lg object-cover border border-border" onError={e => (e.currentTarget.style.display = "none")} />}
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
              <Label htmlFor="is_active">Active (visible on storefront)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
              {createProduct.isPending || updateProduct.isPending ? "Saving…" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
