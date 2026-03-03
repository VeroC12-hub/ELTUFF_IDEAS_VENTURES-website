import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProductionBatches, useCreateProductionBatch, useUpdateProductionBatch, useDeleteProductionBatch, generateBatchNumber } from "@/hooks/useProductionBatches";
import { useAllProducts } from "@/hooks/useProducts";
import { useRecipes } from "@/hooks/useProduction";
import { format } from "date-fns";
import {
  LayoutDashboard, Users, Package, PackageOpen, Receipt,
  BarChart3, Settings, ShoppingCart, UserPlus,
  Warehouse, CreditCard, ClipboardList, FlaskConical, BookOpen,
  Calculator, Plus, Pencil, Trash2, Loader2, BookMarked,
} from "lucide-react";

import navGroups from "@/lib/staffNavGroups";

const STATUS_COLORS: Record<string, string> = {
  completed:   "bg-success/10 text-success",
  in_progress: "bg-info/10 text-info",
  rejected:    "bg-destructive/10 text-destructive",
};

const fmtDate = (d: string) => { try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; } };

type MaterialRow = { name: string; qty: string; unit: string };

const emptyForm = {
  batch_number: "",
  production_date: new Date().toISOString().slice(0, 10),
  product_name: "",
  product_id: "",
  recipe_id: "",
  quantity_produced: "",
  unit: "",
  supervisor: "",
  status: "completed",
  notes: "",
};

export default function BatchesPage() {
  const { data: batches = [], isLoading } = useProductionBatches();
  const { data: products = [] } = useAllProducts();
  const { data: recipes = [] } = useRecipes();
  const createBatch = useCreateProductionBatch();
  const updateBatch = useUpdateProductionBatch();
  const deleteBatch = useDeleteProductionBatch();
  const { toast } = useToast();

  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([{ name: "", qty: "", unit: "" }]);

  const openCreate = () => {
    setForm({ ...emptyForm, batch_number: generateBatchNumber() });
    setMaterials([{ name: "", qty: "", unit: "" }]);
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setForm({
      batch_number: b.batch_number,
      production_date: b.production_date,
      product_name: b.product_name,
      product_id: b.product_id ?? "",
      recipe_id: b.recipe_id ?? "",
      quantity_produced: String(b.quantity_produced),
      unit: b.unit ?? "",
      supervisor: b.supervisor ?? "",
      status: b.status,
      notes: b.notes ?? "",
    });
    const mats = Array.isArray(b.raw_materials_used) ? b.raw_materials_used : [];
    setMaterials(mats.length > 0 ? mats.map((m: any) => ({ name: m.name ?? "", qty: String(m.qty ?? ""), unit: m.unit ?? "" })) : [{ name: "", qty: "", unit: "" }]);
    setEditId(b.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.batch_number || !form.product_name || !form.quantity_produced) {
      toast({ title: "Batch number, product and quantity are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const rawMaterials = materials.filter(m => m.name.trim()).map(m => ({ name: m.name, qty: parseFloat(m.qty) || 0, unit: m.unit }));
      const payload = {
        batch_number: form.batch_number,
        production_date: form.production_date,
        product_name: form.product_name,
        product_id: form.product_id || null,
        recipe_id: form.recipe_id || null,
        quantity_produced: parseFloat(form.quantity_produced),
        unit: form.unit || null,
        raw_materials_used: rawMaterials.length > 0 ? rawMaterials : null,
        supervisor: form.supervisor || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editId) await updateBatch.mutateAsync({ id: editId, ...payload });
      else await createBatch.mutateAsync(payload);
      toast({ title: editId ? "Batch updated" : "Batch recorded" });
      setOpen(false);
    } catch { toast({ title: "Error saving batch", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this batch record?")) return;
    await deleteBatch.mutateAsync(id);
    toast({ title: "Deleted" });
  };

  const addMaterialRow = () => setMaterials(m => [...m, { name: "", qty: "", unit: "" }]);
  const removeMaterialRow = (i: number) => setMaterials(m => m.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, key: keyof MaterialRow, val: string) =>
    setMaterials(m => m.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  const filtered = useMemo(() =>
    batches.filter(b =>
      b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.supervisor ?? "").toLowerCase().includes(search.toLowerCase())
    ), [batches, search]);

  const counts = { completed: batches.filter(b => b.status === "completed").length, in_progress: batches.filter(b => b.status === "in_progress").length, rejected: batches.filter(b => b.status === "rejected").length };
  const totalQty = batches.filter(b => b.status === "completed").reduce((s, b) => s + b.quantity_produced, 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Production Batch Records</h1>
            <p className="text-muted-foreground text-sm">Track every production run for quality control and traceability</p>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Batch
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Batches", value: String(batches.length) },
            { label: "Completed",     value: String(counts.completed),   color: "text-success" },
            { label: "In Progress",   value: String(counts.in_progress), color: "text-info" },
            { label: "Total Qty Produced", value: `${totalQty.toFixed(1)} units` },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color ?? ""}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <Input placeholder="Search batch number, product or supervisor…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Batch No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Qty Produced</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Supervisor</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{search ? "No batches match your search" : "No batch records yet"}</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs font-semibold">{b.batch_number}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(b.production_date)}</td>
                    <td className="p-3 font-medium">{b.product_name}</td>
                    <td className="p-3 text-right">{b.quantity_produced} {b.unit ?? ""}</td>
                    <td className="p-3 text-muted-foreground">{b.supervisor ?? "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? "bg-secondary text-secondary-foreground"}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(b)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(b.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Batch Record" : "New Batch Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Batch Number *</label>
                <Input value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} className="mt-1 h-9" placeholder="BAT-2026-XXXX" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Production Date</label>
                <Input type="date" value={form.production_date} onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Product *</label>
              {products.length > 0 ? (
                <Select value={form.product_id || "__manual__"} onValueChange={v => {
                  if (v === "__manual__") { setForm(f => ({ ...f, product_id: "", product_name: "" })); return; }
                  const p = products.find(p => p.id === v);
                  setForm(f => ({ ...f, product_id: v, product_name: p?.name ?? "" }));
                }}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Type name manually</SelectItem>
                    {products.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              {(!form.product_id || products.length === 0) && (
                <Input placeholder="Product name" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="mt-1 h-9" />
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Recipe (optional)</label>
              <Select value={form.recipe_id} onValueChange={v => setForm(f => ({ ...f, recipe_id: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Link to recipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {recipes.filter(r => r.is_active).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Quantity Produced *</label>
                <Input type="number" placeholder="0" value={form.quantity_produced} onChange={e => setForm(f => ({ ...f, quantity_produced: e.target.value }))} className="mt-1 h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unit</label>
                <Input placeholder="e.g. bottles, litres, kg" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Supervisor</label>
              <Input placeholder="Supervisor name" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} className="mt-1 h-9" />
            </div>

            {/* Raw materials used */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Raw Materials Used</label>
                <button onClick={addMaterialRow} className="text-xs text-primary hover:underline">+ Add row</button>
              </div>
              <div className="space-y-2">
                {materials.map((mat, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Material name" value={mat.name} onChange={e => updateMaterial(i, "name", e.target.value)} className="h-8 text-xs flex-1" />
                    <Input placeholder="Qty" type="number" value={mat.qty} onChange={e => updateMaterial(i, "qty", e.target.value)} className="h-8 text-xs w-20" />
                    <Input placeholder="Unit" value={mat.unit} onChange={e => updateMaterial(i, "unit", e.target.value)} className="h-8 text-xs w-20" />
                    {materials.length > 1 && (
                      <button onClick={() => removeMaterialRow(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-9" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Batch
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
