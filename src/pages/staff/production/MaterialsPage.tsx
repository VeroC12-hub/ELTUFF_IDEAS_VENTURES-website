import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRawMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, useMaterialPriceHistory, RawMaterial } from "@/hooks/useProduction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Package, PackageOpen, Receipt, BarChart3, Settings,
  ShoppingCart, UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator, Search, Plus, Pencil,
  Trash2, History,
} from "lucide-react";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview",    items: [{ title: "Dashboard",   url: "/staff/dashboard",              icon: LayoutDashboard }] },
  { label: "Sales",       items: [{ title: "Quotes",      url: "/staff/quotes",                 icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management",  items: [{ title: "Clients",     url: "/staff/clients",                icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }, { title: "Bottles & Labels", url: "/staff/bottles-labels", icon: PackageOpen }] },
  { label: "Finance",     items: [{ title: "Accounts",    url: "/staff/accounts",               icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "Production",  items: [{ title: "Materials",   url: "/staff/production/materials",   icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "System",      items: [{ title: "Team",        url: "/staff/team",                   icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const UNITS = ["kg", "g", "L", "ml", "pcs", "bag", "box", "bottle", "drum", "ton"];

const emptyForm = { name: "", unit: "kg", cost_per_unit: "", supplier: "", notes: "", is_active: true };

export default function MaterialsPage() {
  const { data: materials = [], isLoading } = useRawMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const { toast } = useToast();

  const [search, setSearch]             = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<RawMaterial | null>(null);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [historyTarget,setHistoryTarget]= useState<RawMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit   = (m: RawMaterial) => {
    setEditTarget(m);
    setForm({ name: m.name, unit: m.unit, cost_per_unit: String(m.cost_per_unit), supplier: m.supplier ?? "", notes: m.notes ?? "", is_active: m.is_active });
    setDialogOpen(true);
  };
  const openHistory = (m: RawMaterial) => { setHistoryTarget(m); setHistoryOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    const cost = parseFloat(form.cost_per_unit as string);
    if (isNaN(cost) || cost < 0) return toast({ title: "Enter a valid cost", variant: "destructive" });
    setSaving(true);
    try {
      if (editTarget) {
        await updateMaterial.mutateAsync({ id: editTarget.id, name: form.name.trim(), unit: form.unit, cost_per_unit: cost, supplier: form.supplier.trim(), notes: form.notes.trim(), is_active: form.is_active });
        toast({ title: "Material updated", description: form.name });
      } else {
        await createMaterial.mutateAsync({ name: form.name.trim(), unit: form.unit, cost_per_unit: cost, supplier: form.supplier.trim(), notes: form.notes.trim(), is_active: form.is_active });
        toast({ title: "Material added", description: form.name });
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    materials.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = m.name.toLowerCase().includes(q) ||
        (m.supplier ?? "").toLowerCase().includes(q);
      const matchActive = showInactive ? true : m.is_active;
      return matchSearch && matchActive;
    }),
    [materials, search, showInactive]
  );

  const activeMaterials  = materials.filter(m => m.is_active);
  const totalValue       = activeMaterials.reduce((s, m) => s + m.cost_per_unit, 0);

  const toggleActive = async (m: RawMaterial) => {
    await updateMaterial.mutateAsync({ id: m.id, is_active: !m.is_active });
    toast({
      title: m.is_active ? "Material deactivated" : "Material activated",
      description: m.name,
    });
  };

  const handleDelete = async (m: RawMaterial) => {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    try {
      await deleteMaterial.mutateAsync(m.id);
      toast({ title: "Material deleted", description: m.name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Cannot delete — material may be used in recipes.";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Raw Materials</h1>
            <p className="text-muted-foreground text-sm">
              {activeMaterials.length} active ingredient{activeMaterials.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Materials</p>
            <p className="text-2xl font-bold mt-0.5">{materials.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold mt-0.5 text-success">{activeMaterials.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold mt-0.5 text-muted-foreground">
              {materials.length - activeMaterials.length}
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search by name or supplier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none px-3 py-2 rounded-lg border border-border bg-background">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Material</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cost / Unit</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Updated</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-4 bg-muted/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground text-sm">
                      {search ? "No materials match your search" : "No materials yet — add your first ingredient"}
                    </td>
                  </tr>
                ) : filtered.map(m => (
                  <tr
                    key={m.id}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${!m.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="p-3">
                      <p className="font-medium">{m.name}</p>
                      {m.notes && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{m.notes}</p>}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{m.unit}</td>
                    <td className="p-3 text-right font-semibold">
                      ₵ {m.cost_per_unit.toFixed(4)}
                      <span className="text-xs text-muted-foreground font-normal ml-1">/{m.unit}</span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{m.supplier || "—"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(m)}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          m.is_active
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {m.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {format(new Date(m.updated_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openHistory(m)}
                          title="Price history"
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      {/* ── Create / Edit dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={o => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Material" : "Add Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name *</label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sodium Hydroxide"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Unit *</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cost per {form.unit} (₵) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.0001}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.cost_per_unit}
                  onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))}
                  placeholder="0.0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Supplier</label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.supplier}
                onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                placeholder="Supplier name (optional)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Storage conditions, grade, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="rounded"
              />
              Active (available for use in recipes)
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Material"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Price history dialog ──────────────────────────────────────────── */}
      <PriceHistoryDialog
        material={historyTarget}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

    </DashboardLayout>
  );
}

// ── Price history sub-component ───────────────────────────────────────────────
function PriceHistoryDialog({
  material, open, onClose,
}: {
  material: RawMaterial | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useMaterialPriceHistory(material?.id ?? "");

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Price History — {material.name}
          </DialogTitle>
        </DialogHeader>

        {/* Current price banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current price</span>
          <span className="font-bold text-primary">
            ₵ {material.cost_per_unit.toFixed(4)} / {material.unit}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No price changes recorded yet.
            <p className="text-xs mt-1">Price changes are automatically logged when you edit this material.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Change log ({history.length})
            </p>
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {history.map((h, i) => {
                const increased = h.new_price > h.old_price;
                const pctChange = h.old_price > 0
                  ? ((h.new_price - h.old_price) / h.old_price) * 100
                  : 0;
                return (
                  <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through text-xs">
                          ₵ {h.old_price.toFixed(4)}
                        </span>
                        <span className="text-foreground font-semibold">
                          ₵ {h.new_price.toFixed(4)}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          increased
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success"
                        }`}>
                          {increased ? "▲" : "▼"} {Math.abs(pctChange).toFixed(1)}%
                        </span>
                      </div>
                      {h.notes && (
                        <p className="text-xs text-muted-foreground">{h.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(h.created_at), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(h.created_at), "HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
