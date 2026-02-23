import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useRecipes, useRawMaterials } from "@/hooks/useProduction";
import { calcRecipeCost } from "./RecipesPage";
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3, Settings,
  ShoppingCart, UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator, ChevronDown, ShoppingBag,
  CheckCircle2, AlertCircle,
} from "lucide-react";

const navGroups = [
  { label: "Overview",   items: [{ title: "Dashboard",  url: "/staff/dashboard",             icon: LayoutDashboard }] },
  { label: "Sales",      items: [{ title: "Quotes",     url: "/staff/quotes",                icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients",    url: "/staff/clients",               icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production", items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",    items: [{ title: "Accounts",   url: "/staff/accounts",              icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",     items: [{ title: "Team",       url: "/staff/team",                  icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

export default function CalculatorPage() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: materials = [] } = useRawMaterials();
  const activeRecipes = recipes.filter(r => r.is_active);

  const [selectedId,  setSelectedId]  = useState<string>("");
  const [batches,     setBatches]     = useState("1");
  const [sellPrice,   setSellPrice]   = useState("");
  const [markup,      setMarkup]      = useState("50");
  const [fixedCosts,  setFixedCosts]  = useState("0");

  const recipe = activeRecipes.find(r => r.id === selectedId) ?? null;

  // ── Core cost calculations ─────────────────────────────────────────────────
  const calc = useMemo(() => {
    if (!recipe) return null;
    const batchCount  = parseFloat(batches) || 1;
    const { matCost, ohCost, total, costPerUnit } = calcRecipeCost(recipe);
    const totalUnits  = recipe.batch_yield * batchCount;
    const totalMat    = matCost  * batchCount;
    const totalOh     = ohCost   * batchCount;
    const totalCost   = total    * batchCount;
    return { batchCount, matCost, ohCost, total, costPerUnit, totalUnits, totalMat, totalOh, totalCost };
  }, [recipe, batches]);

  // Sync markup → sellPrice and vice-versa
  const handleMarkupChange = (val: string) => {
    setMarkup(val);
    if (calc) {
      const m = parseFloat(val) || 0;
      setSellPrice((calc.costPerUnit * (1 + m / 100)).toFixed(2));
    }
  };
  const handleSellPriceChange = (val: string) => {
    setSellPrice(val);
    if (calc) {
      const sp = parseFloat(val) || 0;
      if (sp > 0 && calc.costPerUnit > 0) {
        setMarkup((((sp - calc.costPerUnit) / calc.costPerUnit) * 100).toFixed(1));
      }
    }
  };

  const sp        = parseFloat(sellPrice) || 0;
  const marginPct = sp > 0 && calc ? ((sp - calc.costPerUnit) / sp) * 100 : 0;
  const profitUnit= sp - (calc?.costPerUnit ?? 0);
  const totalProfit = profitUnit * (calc?.totalUnits ?? 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Production Calculator</h1>
          <p className="text-muted-foreground text-sm">
            Calculate production cost, pricing, and profit for any recipe
          </p>
        </div>

        {/* Recipe + batch selector */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display font-semibold">Setup</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Recipe</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8"
                  value={selectedId}
                  onChange={e => {
                    setSelectedId(e.target.value);
                    setSellPrice("");
                    setMarkup("50");
                  }}
                >
                  <option value="">— Choose a recipe —</option>
                  {activeRecipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {isLoading && <p className="text-xs text-muted-foreground">Loading recipes…</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Number of Batches</label>
              <input
                type="number" min={0.1} step={0.1}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={batches}
                onChange={e => setBatches(e.target.value)}
              />
              {calc && (
                <p className="text-xs text-muted-foreground">
                  = {calc.totalUnits % 1 === 0 ? calc.totalUnits : calc.totalUnits.toFixed(2)} {recipe?.yield_unit} produced
                </p>
              )}
            </div>
          </div>
        </div>

        {!recipe ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
            <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Select a recipe to begin</p>
            <p className="text-xs mt-1">All calculations update live as you type</p>
          </div>
        ) : calc && (
          <>
            {/* Cost breakdown */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-display font-semibold">Cost Breakdown</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {calc.batchCount} batch{calc.batchCount !== 1 ? "es" : ""} × {recipe.batch_yield} {recipe.yield_unit}
                </p>
              </div>

              {/* Ingredients */}
              <div className="divide-y divide-border">
                <div className="px-5 py-2 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingredients</p>
                </div>
                {(recipe.recipe_ingredients ?? []).map(ing => {
                  const cpu       = ing.raw_materials?.cost_per_unit ?? 0;
                  const qtyBatch  = ing.quantity_per_batch;
                  const qtyTotal  = qtyBatch * calc.batchCount;
                  const costTotal = qtyTotal * cpu;
                  const pct       = calc.totalCost > 0 ? (costTotal / calc.totalCost) * 100 : 0;
                  return (
                    <div key={ing.id} className="px-5 py-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{ing.raw_materials?.name ?? "Unknown"}</span>
                        <span className="font-semibold">₵ {costTotal.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{qtyTotal % 1 === 0 ? qtyTotal : qtyTotal.toFixed(3)} {ing.raw_materials?.unit} needed · ₵ {cpu.toFixed(4)}/{ing.raw_materials?.unit}</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                {/* Overheads */}
                {(recipe.recipe_overheads ?? []).length > 0 && (
                  <>
                    <div className="px-5 py-2 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overheads</p>
                    </div>
                    {(recipe.recipe_overheads ?? []).map(oh => {
                      const costTotal = oh.cost_per_batch * calc.batchCount;
                      const pct = calc.totalCost > 0 ? (costTotal / calc.totalCost) * 100 : 0;
                      return (
                        <div key={oh.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">{oh.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">({pct.toFixed(1)}%)</span>
                          </div>
                          <span className="font-medium">₵ {costTotal.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Totals footer */}
                <div className="bg-muted/20 divide-y divide-border">
                  <div className="px-5 py-2.5 flex justify-between text-sm text-muted-foreground">
                    <span>Total material cost</span>
                    <span>₵ {calc.totalMat.toFixed(4)}</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between text-sm text-muted-foreground">
                    <span>Total overhead cost</span>
                    <span>₵ {calc.totalOh.toFixed(2)}</span>
                  </div>
                  <div className="px-5 py-3 flex justify-between text-sm font-bold">
                    <span>Total production cost</span>
                    <span>₵ {calc.totalCost.toFixed(4)}</span>
                  </div>
                  <div className="px-5 py-3 flex justify-between text-base font-bold text-primary">
                    <span>Cost per {recipe.yield_unit}</span>
                    <span>₵ {calc.costPerUnit.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* ── Pricing & profit ──────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <h3 className="font-display font-semibold">Pricing & Profit</h3>

              {/* Dual inputs — markup ↔ sell price sync */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Markup on Cost (%)</label>
                  <div className="relative">
                    <input
                      type="number" min={0} step={0.5}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={markup}
                      onChange={e => handleMarkupChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Profit added on top of cost per {recipe.yield_unit}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Selling Price (₵ per {recipe.yield_unit})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₵</span>
                    <input
                      type="number" min={0} step={0.01}
                      className="w-full rounded-lg border border-border bg-background px-6 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={sellPrice}
                      onChange={e => handleSellPriceChange(e.target.value)}
                      placeholder={(calc.costPerUnit * 1.5).toFixed(2)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cost: ₵ {calc.costPerUnit.toFixed(4)} · updates markup automatically
                  </p>
                </div>
              </div>

              {/* Profit metrics grid */}
              {sp > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label:   "Profit / Unit",
                      value:   `₵ ${profitUnit.toFixed(4)}`,
                      sub:     profitUnit >= 0 ? "per " + recipe.yield_unit : "loss per unit",
                      color:   profitUnit >= 0 ? "text-success" : "text-destructive",
                      bg:      profitUnit >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20",
                    },
                    {
                      label:   "Profit Margin",
                      value:   `${marginPct.toFixed(1)}%`,
                      sub:     "of selling price",
                      color:   marginPct >= 20 ? "text-success" : marginPct >= 10 ? "text-warning" : "text-destructive",
                      bg:      marginPct >= 20 ? "bg-success/5 border-success/20" : marginPct >= 10 ? "bg-warning/5 border-warning/20" : "bg-destructive/5 border-destructive/20",
                    },
                    {
                      label:   "Total Gross Profit",
                      value:   `₵ ${totalProfit.toFixed(2)}`,
                      sub:     `${calc.totalUnits % 1 === 0 ? calc.totalUnits : calc.totalUnits.toFixed(1)} units × ₵ ${profitUnit.toFixed(2)}`,
                      color:   totalProfit >= 0 ? "text-success" : "text-destructive",
                      bg:      totalProfit >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20",
                    },
                    {
                      label:   "ROI",
                      value:   calc.totalCost > 0 ? `${((totalProfit / calc.totalCost) * 100).toFixed(1)}%` : "—",
                      sub:     "return on production cost",
                      color:   totalProfit >= 0 ? "text-primary" : "text-destructive",
                      bg:      "bg-primary/5 border-primary/20",
                    },
                  ].map(card => (
                    <div key={card.label} className={`border rounded-xl p-4 ${card.bg}`}>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Revenue summary */}
              {sp > 0 && (
                <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="font-bold text-base mt-0.5">
                      ₵ {(sp * calc.totalUnits).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="font-bold text-base mt-0.5 text-muted-foreground">
                      ₵ {calc.totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`font-bold text-base mt-0.5 ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      ₵ {totalProfit.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Warning if selling below cost */}
              {sp > 0 && sp < calc.costPerUnit && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive font-medium">
                  ⚠ Selling price is below cost per unit. You are losing ₵ {Math.abs(profitUnit).toFixed(4)} per {recipe.yield_unit}.
                </div>
              )}
            </div>

            {/* ── Break-even analysis ───────────────────────────────────── */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-display font-semibold">Break-Even Analysis</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How many units must you sell to recover all costs?
                </p>
              </div>

              {/* Optional fixed costs input */}
              <div className="space-y-1.5 max-w-xs">
                <label className="text-sm font-medium">Additional Fixed Costs (₵)</label>
                <input
                  type="number" min={0} step={1}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={fixedCosts}
                  onChange={e => setFixedCosts(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Add rent, equipment, or any one-time costs not in the recipe
                </p>
              </div>

              {(() => {
                const fixed      = parseFloat(fixedCosts) || 0;
                const totalFixed = calc.totalCost + fixed;

                if (sp <= 0) return (
                  <p className="text-sm text-muted-foreground italic">Enter a selling price above to see break-even</p>
                );

                if (sp <= calc.costPerUnit) return (
                  <p className="text-sm text-destructive font-medium">
                    Selling price must exceed cost per unit (₵ {calc.costPerUnit.toFixed(4)}) to calculate break-even
                  </p>
                );

                const beUnits   = totalFixed / (sp - calc.costPerUnit);
                const beRevenue = beUnits * sp;
                const batNeeded = Math.ceil(beUnits / recipe.batch_yield);
                const pctOfBatch = (beUnits / calc.totalUnits) * 100;

                return (
                  <div className="space-y-4">
                    {/* BE metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Break-Even Units",    value: Math.ceil(beUnits).toLocaleString(),          sub: recipe.yield_unit + " to sell",       color: "text-primary"    },
                        { label: "Break-Even Revenue",  value: `₵ ${beRevenue.toFixed(2)}`,                  sub: "total sales needed",                 color: "text-foreground" },
                        { label: "Batches Needed",      value: batNeeded.toLocaleString(),                   sub: `to produce ${Math.ceil(beUnits)} units`, color: "text-foreground" },
                        { label: "% of This Batch",     value: `${Math.min(pctOfBatch, 100).toFixed(1)}%`,   sub: pctOfBatch <= 100 ? "covered in 1 run" : "need more batches", color: pctOfBatch <= 100 ? "text-success" : "text-warning" },
                      ].map(card => (
                        <div key={card.label} className="bg-muted/40 rounded-xl p-4">
                          <p className="text-xs text-muted-foreground">{card.label}</p>
                          <p className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Visual BE progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 units</span>
                        <span className="text-primary font-medium">Break-even: {Math.ceil(beUnits)} {recipe.yield_unit}</span>
                        <span>{calc.totalUnits % 1 === 0 ? calc.totalUnits : calc.totalUnits.toFixed(0)} units (full batch)</span>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pctOfBatch <= 100 ? "bg-primary" : "bg-warning"}`}
                          style={{ width: `${Math.min(pctOfBatch, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pctOfBatch <= 100
                          ? `Sell ${Math.ceil(beUnits)} of your ${calc.totalUnits} units and you've broken even — remaining ${Math.floor(calc.totalUnits - beUnits)} are pure profit`
                          : `This batch alone won't cover costs — you need ${batNeeded} batches`
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Price sensitivity table ────────────────────────────────── */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-display font-semibold">Price Sensitivity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Profit analysis at different markup levels — cost per {recipe.yield_unit}: ₵ {calc.costPerUnit.toFixed(4)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-right p-3 font-medium text-muted-foreground">Markup</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Sell Price</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Profit / Unit</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Margin %</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Batch Profit</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">BE Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[10, 20, 30, 40, 50, 75, 100, 150, 200].map(pct => {
                      const price    = calc.costPerUnit * (1 + pct / 100);
                      const profit   = price - calc.costPerUnit;
                      const margin   = (profit / price) * 100;
                      const batchP   = profit * calc.totalUnits;
                      const fixed    = parseFloat(fixedCosts) || 0;
                      const beU      = (calc.totalCost + fixed) / profit;
                      const isActive = Math.abs(parseFloat(markup) - pct) < 0.5;

                      return (
                        <tr
                          key={pct}
                          onClick={() => handleMarkupChange(String(pct))}
                          className={`border-b border-border/50 cursor-pointer transition-colors ${
                            isActive
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <td className="p-3 text-right font-medium">
                            {isActive && <span className="text-primary mr-1">▶</span>}
                            {pct}%
                          </td>
                          <td className="p-3 text-right font-semibold">₵ {price.toFixed(2)}</td>
                          <td className="p-3 text-right text-success font-medium">₵ {profit.toFixed(4)}</td>
                          <td className={`p-3 text-right font-medium ${margin >= 20 ? "text-success" : margin >= 10 ? "text-warning" : "text-destructive"}`}>
                            {margin.toFixed(1)}%
                          </td>
                          <td className="p-3 text-right text-success font-semibold">₵ {batchP.toFixed(2)}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {Math.ceil(beU).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-2 text-xs text-muted-foreground border-t border-border">
                Click any row to apply that markup to the calculator above
              </p>
            </div>

            {/* ── Material Requirements Planner ─────────────────────────── */}
            {(() => {
              // Build requirements list: ingredient + current stock + shortfall
              const rows = (recipe.recipe_ingredients ?? []).map(ing => {
                const mat     = materials.find(m => m.id === ing.material_id);
                const needed  = ing.quantity_per_batch * calc.batchCount;
                const inStock = mat?.stock_quantity ?? 0;
                const short   = Math.max(0, needed - inStock);
                const cpu     = mat?.cost_per_unit ?? ing.raw_materials?.cost_per_unit ?? 0;
                return {
                  name:      ing.raw_materials?.name ?? mat?.name ?? "Unknown",
                  unit:      ing.raw_materials?.unit ?? mat?.unit ?? "",
                  needed,
                  inStock,
                  short,
                  shortCost: short * cpu,
                  sufficient: short === 0,
                };
              });

              const totalShortCost = rows.reduce((s, r) => s + r.shortCost, 0);
              const allOk          = rows.every(r => r.sufficient);

              return (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Material Requirements
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Stock check for {calc.batchCount} batch{calc.batchCount !== 1 ? "es" : ""} of <strong>{recipe.name}</strong>
                      </p>
                    </div>
                    {allOk ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" /> All stocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 border border-warning/20 px-3 py-1 rounded-full">
                        <AlertCircle className="h-3.5 w-3.5" /> Procurement needed
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Material</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Need</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">In Stock</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Shortfall</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Buy Cost</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={row.name} className={`border-b border-border/50 ${!row.sufficient ? "bg-warning/5" : ""}`}>
                            <td className="p-3 font-medium">{row.name}</td>
                            <td className="p-3 text-right">
                              {row.needed % 1 === 0 ? row.needed : row.needed.toFixed(3)} {row.unit}
                            </td>
                            <td className={`p-3 text-right font-medium ${row.inStock < row.needed ? "text-destructive" : "text-success"}`}>
                              {row.inStock % 1 === 0 ? row.inStock : row.inStock.toFixed(3)} {row.unit}
                            </td>
                            <td className="p-3 text-right">
                              {row.short === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="font-semibold text-warning">
                                  {row.short % 1 === 0 ? row.short : row.short.toFixed(3)} {row.unit}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {row.short === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="font-semibold text-warning">₵ {row.shortCost.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {row.sufficient ? (
                                <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-warning mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {!allOk && (
                        <tfoot>
                          <tr className="border-t border-border bg-warning/5">
                            <td colSpan={4} className="p-3 text-sm font-semibold text-warning">
                              Total procurement cost
                            </td>
                            <td className="p-3 text-right font-bold text-warning">
                              ₵ {totalShortCost.toFixed(2)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {!allOk && (
                    <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                      Stock quantities reflect values stored in{" "}
                      <strong>Materials</strong> — update stock there after purchasing.
                    </div>
                  )}
                </div>
              );
            })()}

          </>
        )}

      </div>
    </DashboardLayout>
  );
}
