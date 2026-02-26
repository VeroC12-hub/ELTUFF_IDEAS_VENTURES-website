import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe,
  useRawMaterials, RecipeWithDetails,
} from "@/hooks/useProduction";
import { useAllProducts } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Package, PackageOpen, Receipt, BarChart3, Settings,
  ShoppingCart, UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator, Search, Plus, Pencil,
  Trash2, Eye, X, Loader2,
} from "lucide-react";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview",   items: [{ title: "Dashboard",  url: "/staff/dashboard",             icon: LayoutDashboard }] },
  { label: "Sales",      items: [{ title: "Quotes",     url: "/staff/quotes",                icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients",    url: "/staff/clients",               icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }, { title: "Bottles & Labels", url: "/staff/bottles-labels", icon: PackageOpen }] },
  { label: "Production", items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",    items: [{ title: "Accounts",   url: "/staff/accounts",              icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",     items: [{ title: "Team",       url: "/staff/team",                  icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const YIELD_UNITS = ["bottles", "pcs", "kg", "L", "bags", "boxes", "units", "sachets", "tubs"];

type IngRow = { material_id: string; quantity_per_batch: string };
type OhRow  = { label: string; cost_per_batch: string };

const emptyRecipe = { name: "", product_id: "", batch_yield: "1", yield_unit: "bottles", notes: "", is_active: true };
const emptyIng: IngRow = { material_id: "", quantity_per_batch: "1" };
const emptyOh:  OhRow  = { label: "", cost_per_batch: "0" };

// ── Cost helpers ──────────────────────────────────────────────────────────────
export function calcRecipeCost(recipe: RecipeWithDetails) {
  const matCost = (recipe.recipe_ingredients ?? []).reduce((s, ing) => {
    const cpu = ing.raw_materials?.cost_per_unit ?? 0;
    return s + ing.quantity_per_batch * cpu;
  }, 0);
  const ohCost = (recipe.recipe_overheads ?? []).reduce((s, oh) => s + oh.cost_per_batch, 0);
  const total  = matCost + ohCost;
  const yield_ = recipe.batch_yield > 0 ? recipe.batch_yield : 1;
  return { matCost, ohCost, total, costPerUnit: total / yield_ };
}

export default function RecipesPage() {
  const { data: recipes   = [], isLoading } = useRecipes();
  const { data: materials = [] }            = useRawMaterials();
  const { data: products  = [] }            = useAllProducts();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const { toast }    = useToast();

  const activeMaterials = materials.filter(m => m.is_active);

  const [search, setSearch]         = useState("");
  const [viewTarget, setViewTarget] = useState<RecipeWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<RecipeWithDetails | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Dialog form state ──────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState(emptyRecipe);
  const [ingredients, setIngredients] = useState<IngRow[]>([{ ...emptyIng }]);
  const [overheads,   setOverheads]   = useState<OhRow[]>([{ ...emptyOh }]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setRecipeForm(emptyRecipe);
    setIngredients([{ ...emptyIng }]);
    setOverheads([{ ...emptyOh }]);
    setDialogOpen(true);
  };

  const openEdit = (r: RecipeWithDetails) => {
    setEditTarget(r);
    setRecipeForm({
      name:        r.name,
      product_id:  r.product_id ?? "",
      batch_yield: String(r.batch_yield),
      yield_unit:  r.yield_unit,
      notes:       r.notes ?? "",
      is_active:   r.is_active,
    });
    setIngredients(
      (r.recipe_ingredients ?? []).length > 0
        ? (r.recipe_ingredients ?? []).map(i => ({
            material_id:        i.material_id,
            quantity_per_batch: String(i.quantity_per_batch),
          }))
        : [{ ...emptyIng }]
    );
    setOverheads(
      (r.recipe_overheads ?? []).length > 0
        ? (r.recipe_overheads ?? []).map(o => ({
            label:          o.label,
            cost_per_batch: String(o.cost_per_batch),
          }))
        : [{ ...emptyOh }]
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!recipeForm.name.trim()) return toast({ title: "Recipe name is required", variant: "destructive" });
    const yield_ = parseFloat(recipeForm.batch_yield);
    if (isNaN(yield_) || yield_ <= 0) return toast({ title: "Batch yield must be > 0", variant: "destructive" });

    const validIngredients = ingredients.filter(i => i.material_id && parseFloat(i.quantity_per_batch) > 0);
    if (validIngredients.length === 0) return toast({ title: "Add at least one ingredient", variant: "destructive" });

    setSaving(true);
    try {
      const recipePayload = {
        name:        recipeForm.name.trim(),
        product_id:  recipeForm.product_id || null,
        batch_yield: yield_,
        yield_unit:  recipeForm.yield_unit,
        notes:       recipeForm.notes.trim(),
        is_active:   recipeForm.is_active,
      };
      const ingPayload = validIngredients.map(i => ({
        recipe_id:          "",   // filled by hook
        material_id:        i.material_id,
        quantity_per_batch: parseFloat(i.quantity_per_batch),
      }));
      const ohPayload = overheads
        .filter(o => o.label.trim() && parseFloat(o.cost_per_batch) > 0)
        .map(o => ({
          recipe_id:      "",  // filled by hook
          label:          o.label.trim(),
          cost_per_batch: parseFloat(o.cost_per_batch),
        }));

      if (editTarget) {
        await updateRecipe.mutateAsync({ id: editTarget.id, recipe: recipePayload, ingredients: ingPayload, overheads: ohPayload });
        toast({ title: "Recipe updated", description: recipeForm.name });
      } else {
        await createRecipe.mutateAsync({ recipe: recipePayload, ingredients: ingPayload, overheads: ohPayload });
        toast({ title: "Recipe created", description: recipeForm.name });
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() =>
    recipes.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.products?.name ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [recipes, search]
  );

  const handleDelete = async (r: RecipeWithDetails) => {
    if (!confirm(`Delete recipe "${r.name}"?`)) return;
    try {
      await deleteRecipe.mutateAsync(r.id);
      toast({ title: "Recipe deleted", description: r.name });
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Recipes & Formulas</h1>
            <p className="text-muted-foreground text-sm">
              {recipes.filter(r => r.is_active).length} active recipe{recipes.filter(r => r.is_active).length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Recipe
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search recipes or products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Recipe cards grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search ? "No recipes match your search" : "No recipes yet — create your first formula"}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const { matCost, ohCost, total, costPerUnit } = calcRecipeCost(r);
              return (
                <div key={r.id} className={`bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors ${!r.is_active ? "opacity-60" : ""}`}>
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold text-sm">{r.name}</h3>
                      {r.products?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">→ {r.products.name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Cost summary */}
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Materials</span><span>₵ {matCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Overheads</span><span>₵ {ohCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                      <span>Cost / {r.yield_unit}</span>
                      <span className="text-primary">₵ {costPerUnit.toFixed(4)}</span>
                    </div>
                  </div>

                  {/* Batch info */}
                  <p className="text-xs text-muted-foreground">
                    Batch: {r.batch_yield} {r.yield_unit} ·{" "}
                    {(r.recipe_ingredients ?? []).length} ingredient{(r.recipe_ingredients ?? []).length !== 1 ? "s" : ""}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t border-border">
                    <button
                      onClick={() => setViewTarget(r)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
      {/* ── View / Detail dialog ──────────────────────────────────────────── */}
      {viewTarget && (
        <RecipeViewDialog
          recipe={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setViewTarget(null); openEdit(viewTarget); }}
        />
      )}

      {/* ── Create / Edit dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={o => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit: ${editTarget.name}` : "New Recipe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* ── Recipe meta ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Recipe Name *</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={recipeForm.name}
                  onChange={e => setRecipeForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Liquid Soap Formula A"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Linked Product</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={recipeForm.product_id}
                  onChange={e => setRecipeForm(p => ({ ...p, product_id: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Yield Unit</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={recipeForm.yield_unit}
                  onChange={e => setRecipeForm(p => ({ ...p, yield_unit: e.target.value }))}
                >
                  {YIELD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Batch Yield ({recipeForm.yield_unit}) *</label>
                <input
                  type="number" min={0.001} step={0.001}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={recipeForm.batch_yield}
                  onChange={e => setRecipeForm(p => ({ ...p, batch_yield: e.target.value }))}
                  placeholder="e.g. 50"
                />
                <p className="text-xs text-muted-foreground">How many {recipeForm.yield_unit} does one batch produce?</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={recipeForm.notes}
                  onChange={e => setRecipeForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox" checked={recipeForm.is_active}
                    onChange={e => setRecipeForm(p => ({ ...p, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Active recipe
                </label>
              </div>
            </div>

            {/* ── Ingredients ─────────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ingredients *</h3>
                <button
                  onClick={() => setIngredients(p => [...p, { ...emptyIng }])}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_80px_28px] bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground gap-2">
                  <span>Material</span><span>Qty / batch</span><span className="text-right">Cost</span><span />
                </div>
                <div className="divide-y divide-border">
                  {ingredients.map((row, i) => {
                    const mat    = activeMaterials.find(m => m.id === row.material_id);
                    const qty    = parseFloat(row.quantity_per_batch) || 0;
                    const cost   = mat ? qty * mat.cost_per_unit : 0;
                    return (
                      <div key={i} className="grid grid-cols-[1fr_100px_80px_28px] items-center px-3 py-2 gap-2">
                        <select
                          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={row.material_id}
                          onChange={e => {
                            const updated = [...ingredients];
                            updated[i] = { ...updated[i], material_id: e.target.value };
                            setIngredients(updated);
                          }}
                        >
                          <option value="">— Select —</option>
                          {activeMaterials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                          ))}
                        </select>
                        <input
                          type="number" min={0} step={0.001}
                          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={row.quantity_per_batch}
                          onChange={e => {
                            const updated = [...ingredients];
                            updated[i] = { ...updated[i], quantity_per_batch: e.target.value };
                            setIngredients(updated);
                          }}
                        />
                        <span className="text-xs text-right text-muted-foreground">
                          {cost > 0 ? `₵ ${cost.toFixed(2)}` : "—"}
                        </span>
                        <button
                          onClick={() => setIngredients(p => p.filter((_, j) => j !== i))}
                          className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Overhead costs ──────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Overhead Costs</h3>
                <button
                  onClick={() => setOverheads(p => [...p, { ...emptyOh }])}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Per-batch costs: labor, packaging, utilities, fuel, etc.
              </p>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_28px] bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground gap-2">
                  <span>Description</span><span>Cost / batch (₵)</span><span />
                </div>
                <div className="divide-y divide-border">
                  {overheads.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px_28px] items-center px-3 py-2 gap-2">
                      <input
                        className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={row.label}
                        onChange={e => {
                          const updated = [...overheads];
                          updated[i] = { ...updated[i], label: e.target.value };
                          setOverheads(updated);
                        }}
                        placeholder="e.g. Labor, Packaging…"
                      />
                      <input
                        type="number" min={0} step={0.01}
                        className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={row.cost_per_batch}
                        onChange={e => {
                          const updated = [...overheads];
                          updated[i] = { ...updated[i], cost_per_batch: e.target.value };
                          setOverheads(updated);
                        }}
                      />
                      <button
                        onClick={() => setOverheads(p => p.filter((_, j) => j !== i))}
                        className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {overheads.length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                      No overhead costs added
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Live cost preview ────────────────────────────────────────── */}
            {(() => {
              const matCost = ingredients.reduce((s, row) => {
                const mat = activeMaterials.find(m => m.id === row.material_id);
                const qty = parseFloat(row.quantity_per_batch) || 0;
                return s + (mat ? qty * mat.cost_per_unit : 0);
              }, 0);
              const ohCost = overheads.reduce((s, row) => s + (parseFloat(row.cost_per_batch) || 0), 0);
              const total  = matCost + ohCost;
              const yield_ = parseFloat(recipeForm.batch_yield) || 1;
              const cpu    = total / yield_;

              return (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-primary">Live Cost Preview</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Material cost</span>
                      <span>₵ {matCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Overhead cost</span>
                      <span>₵ {ohCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold col-span-2 border-t border-primary/20 pt-2 mt-1">
                      <span>Total batch cost</span>
                      <span>₵ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-primary font-bold col-span-2 text-base">
                      <span>Cost per {recipeForm.yield_unit}</span>
                      <span>₵ {cpu.toFixed(4)}</span>
                    </div>
                  </div>

                  {/* Quick markup helper */}
                  {cpu > 0 && (
                    <div className="border-t border-primary/20 pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Quick pricing</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[25, 50, 100].map(markup => (
                          <div key={markup} className="bg-background rounded-lg px-3 py-2 text-center border border-border">
                            <p className="text-xs text-muted-foreground">{markup}% markup</p>
                            <p className="text-sm font-bold text-foreground">
                              ₵ {(cpu * (1 + markup / 100)).toFixed(2)}
                            </p>
                            <p className="text-xs text-success">
                              {(markup / (1 + markup / 100)).toFixed(1)}% margin
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDialogOpen(false)} disabled={saving}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Recipe"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

// ── Recipe detail dialog ──────────────────────────────────────────────────────
function RecipeViewDialog({
  recipe, onClose, onEdit,
}: {
  recipe: RecipeWithDetails;
  onClose: () => void;
  onEdit:  () => void;
}) {
  const { matCost, ohCost, total, costPerUnit } = calcRecipeCost(recipe);
  const [markup, setMarkup] = useState("50");

  const markupPct   = parseFloat(markup) || 0;
  const sellPrice   = costPerUnit * (1 + markupPct / 100);
  const marginPct   = sellPrice > 0 ? ((sellPrice - costPerUnit) / sellPrice) * 100 : 0;
  const profitPerUnit = sellPrice - costPerUnit;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>{recipe.name}</DialogTitle>
              {recipe.products?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">→ {recipe.products.name}</p>
              )}
            </div>
            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${recipe.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {recipe.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Batch info */}
          <div className="flex gap-4 text-sm">
            <div className="bg-muted/40 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Batch yield</p>
              <p className="font-bold">{recipe.batch_yield} {recipe.yield_unit}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Ingredients</p>
              <p className="font-bold">{(recipe.recipe_ingredients ?? []).length}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Overheads</p>
              <p className="font-bold">{(recipe.recipe_overheads ?? []).length}</p>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Ingredients</h3>
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {(recipe.recipe_ingredients ?? []).length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">No ingredients</p>
              ) : (recipe.recipe_ingredients ?? []).map(ing => {
                const cpu  = ing.raw_materials?.cost_per_unit ?? 0;
                const cost = ing.quantity_per_batch * cpu;
                const pct  = total > 0 ? (cost / total) * 100 : 0;
                return (
                  <div key={ing.id} className="px-4 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{ing.raw_materials?.name ?? "Unknown"}</span>
                      <span className="font-semibold">₵ {cost.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{ing.quantity_per_batch} {ing.raw_materials?.unit} × ₵ {cpu.toFixed(4)}/{ing.raw_materials?.unit}</span>
                      <span>{pct.toFixed(1)}% of total</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overheads */}
          {(recipe.recipe_overheads ?? []).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Overhead Costs</h3>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                {(recipe.recipe_overheads ?? []).map(oh => (
                  <div key={oh.id} className="px-4 py-2.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">{oh.label}</span>
                    <span className="font-medium">₵ {oh.cost_per_batch.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Materials</span><span>₵ {matCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Overheads</span><span>₵ {ohCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-1">
              <span>Total batch cost</span><span>₵ {total.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-primary font-bold text-base">
              <span>Cost / {recipe.yield_unit}</span><span>₵ {costPerUnit.toFixed(4)}</span>
            </div>
          </div>

          {/* Pricing calculator */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Pricing Calculator</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Markup %</label>
              <input
                type="number" min={0} step={1}
                className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={markup}
                onChange={e => setMarkup(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">on cost per unit</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Selling Price",    value: `₵ ${sellPrice.toFixed(2)}`,       color: "text-foreground" },
                { label: "Profit / Unit",    value: `₵ ${profitPerUnit.toFixed(2)}`,    color: "text-success"    },
                { label: "Profit Margin",    value: `${marginPct.toFixed(1)}%`,          color: "text-success"    },
                { label: "Markup on Cost",   value: `${markupPct.toFixed(1)}%`,          color: "text-primary"    },
              ].map(item => (
                <div key={item.label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {recipe.notes && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-muted-foreground mb-1">NOTES</p>
              <p className="text-muted-foreground">{recipe.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              Close
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Pencil className="h-4 w-4" /> Edit Recipe
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
