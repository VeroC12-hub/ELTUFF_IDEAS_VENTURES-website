import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useBottlesLabels, useCreateBottleLabel, useUpdateBottleLabel, useDeleteBottleLabel,
  ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, ItemType, BottleLabel,
} from "@/hooks/useBottlesLabels";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Package, Warehouse, Users, Receipt, ShoppingCart,
  ClipboardList, BarChart3, Settings, UserPlus, CreditCard, Plus,
  FlaskConical, BookOpen, Calculator, PackageOpen, Pencil, Trash2,
} from "lucide-react";

type FormData = {
  name: string; item_type: ItemType; size: string; material: string;
  colour: string; unit_cost: string; stock_qty: string; reorder_level: string;
  supplier: string; image_url: string; notes: string; is_active: boolean;
};
const emptyForm: FormData = {
  name: "", item_type: "bottle", size: "", material: "", colour: "",
  unit_cost: "0", stock_qty: "0", reorder_level: "0",
  supplier: "", image_url: "", notes: "", is_active: true,
};

export const navGroups = [
  { label: "Overview",    items: [{ title: "Dashboard",  url: "/staff/dashboard",               icon: LayoutDashboard }] },
  { label: "Sales",       items: [{ title: "Quotes",     url: "/staff/quotes",                  icon: ClipboardList },
                                   { title: "Invoices",   url: "/staff/invoices",                icon: Receipt },
                                   { title: "Orders",     url: "/staff/orders",                  icon: ShoppingCart }] },
  { label: "Management",  items: [{ title: "Clients",    url: "/staff/clients",                 icon: Users },
                                   { title: "Inventory",  url: "/staff/inventory",               icon: Warehouse },
                                   { title: "Products",   url: "/staff/products",                icon: Package },
                                   { title: "Bottles & Labels", url: "/staff/bottles-labels",   icon: PackageOpen }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",    icon: FlaskConical },
                                   { title: "Recipes",    url: "/staff/production/recipes",      icon: BookOpen },
                                   { title: "Calculator", url: "/staff/production/calculator",   icon: Calculator }] },
  { label: "Finance",     items: [{ title: "Accounts",   url: "/staff/accounts",                icon: CreditCard },
                                   { title: "Reports",    url: "/staff/reports",                 icon: BarChart3 }] },
  { label: "System",      items: [{ title: "Team",       url: "/staff/team",                    icon: UserPlus },
                                   { title: "Settings",   url: "/staff/settings",                icon: Settings }] },
];

const ALL_TYPES: ("all" | ItemType)[] = ["all", "bottle", "label", "cap", "pump", "sachet", "other"];

export default function BottlesLabelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: items = [], isLoading } = useBottlesLabels();
  const createItem  = useCreateBottleLabel();
  const updateItem  = useUpdateBottleLabel();
  const deleteItem  = useDeleteBottleLabel();

  const [search, setSearch]   = useState("");
  const [typeFilter, setType] = useState<"all" | ItemType>("all");

  // Dialog state
  const [dialog, setDialog]   = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<BottleLabel | null>(null);
  const [form, setForm]       = useState<FormData>(emptyForm);
  const [deleting, setDeleting] = useState<BottleLabel | null>(null);

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(emptyForm); setEditing(null); setDialog("create"); };
  const openEdit = (item: BottleLabel) => {
    setEditing(item);
    setForm({
      name: item.name, item_type: item.item_type,
      size: item.size ?? "", material: item.material ?? "",
      colour: item.colour ?? "", unit_cost: String(item.unit_cost),
      stock_qty: String(item.stock_qty), reorder_level: String(item.reorder_level),
      supplier: item.supplier ?? "", image_url: item.image_url ?? "",
      notes: item.notes ?? "", is_active: item.is_active,
    });
    setDialog("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(), item_type: form.item_type,
      size: form.size || null, material: form.material || null,
      colour: form.colour || null,
      unit_cost: parseFloat(form.unit_cost) || 0,
      stock_qty: parseFloat(form.stock_qty) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      supplier: form.supplier || null, image_url: form.image_url || null,
      notes: form.notes || null, is_active: form.is_active,
    };
    try {
      if (dialog === "create") {
        await createItem.mutateAsync({ ...payload, created_by: user?.id });
        toast({ title: "Item added" });
      } else if (editing) {
        await updateItem.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Item updated" });
      }
      setDialog(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteItem.mutateAsync(deleting.id);
      toast({ title: "Item deleted" });
      setDeleting(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  // Derived stats
  const totalItems   = items.length;
  const totalValue   = items.reduce((s, i) => s + i.unit_cost * i.stock_qty, 0);
  const lowStock     = items.filter(i => i.stock_qty <= i.reorder_level && i.reorder_level > 0).length;
  const outOfStock   = items.filter(i => i.stock_qty === 0).length;

  const filtered = items.filter(i => {
    const matchType = typeFilter === "all" || i.item_type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || i.name.toLowerCase().includes(q)
      || (i.size ?? "").toLowerCase().includes(q)
      || (i.supplier ?? "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const stockColor = (item: typeof items[0]) => {
    if (item.stock_qty === 0) return "text-destructive font-semibold";
    if (item.stock_qty <= item.reorder_level) return "text-orange-500 font-semibold";
    return "text-green-600";
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Bottles &amp; Labels</h1>
            <p className="text-muted-foreground text-sm">{totalItems} items tracked</p>
          </div>
          <Button variant="accent" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Items",   value: totalItems,             color: "text-primary" },
            { label: "Stock Value",   value: `₵ ${totalValue.toFixed(2)}`, color: "text-green-600" },
            { label: "Low Stock",     value: lowStock,               color: "text-orange-500" },
            { label: "Out of Stock",  value: outOfStock,             color: "text-destructive" },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search name, size, supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-60"
          />
          <div className="flex gap-1 flex-wrap">
            {ALL_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "all" ? "All Types" : ITEM_TYPE_LABELS[t as ItemType]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Size</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Material</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reorder At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No items found</td></tr>
                )}
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name}
                            className="h-8 w-8 rounded object-cover border border-border flex-shrink-0" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_TYPE_COLORS[item.item_type]}`}>
                        {ITEM_TYPE_LABELS[item.item_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.size ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.material ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">₵ {Number(item.unit_cost).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${stockColor(item)}`}>{item.stock_qty}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{item.supplier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(item)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialog !== null} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Add Item" : "Edit Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Clear PET Bottle 250ml" />
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={form.item_type} onValueChange={v => set("item_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map(t => (
                    <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Size / Dimension</Label>
              <Input value={form.size} onChange={e => set("size", e.target.value)} placeholder="e.g. 250ml, 100x70mm, A4" />
            </div>
            <div className="space-y-1">
              <Label>Material</Label>
              <Input value={form.material} onChange={e => set("material", e.target.value)} placeholder="e.g. HDPE, Glass, Paper" />
            </div>
            <div className="space-y-1">
              <Label>Colour</Label>
              <Input value={form.colour} onChange={e => set("colour", e.target.value)} placeholder="e.g. Clear, Amber, White" />
            </div>
            <div className="space-y-1">
              <Label>Unit Cost (₵) *</Label>
              <Input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => set("unit_cost", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" step="any" value={form.stock_qty} onChange={e => set("stock_qty", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reorder Level</Label>
              <Input type="number" min="0" step="any" value={form.reorder_level} onChange={e => set("reorder_level", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Supplier name" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Any additional notes…" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Image</Label>
              <ImageUpload bucket="product-images" value={form.image_url} onChange={url => set("image_url", url)} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="bl_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
              <Label htmlFor="bl_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleting?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteItem.isPending}>
              {deleteItem.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
