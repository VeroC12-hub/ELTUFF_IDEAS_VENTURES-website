import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useInventoryProducts, useInventoryLogs, useAdjustStock } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, ArrowDown, ArrowUp, History, LayoutDashboard, Package, PackageOpen, Warehouse, Users, Receipt, ShoppingCart, ClipboardList, BarChart3, Settings, UserPlus, CreditCard , FlaskConical, BookOpen, Calculator } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }, { title: "Bottles & Labels", url: "/staff/bottles-labels", icon: PackageOpen }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance", items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System", items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

type InventoryProduct = Tables<"products"> & { categories?: { name: string } | null };

export default function InventoryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: products = [], isLoading } = useInventoryProducts();
  const adjustStock = useAdjustStock();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryProduct | null>(null);
  const [logProduct, setLogProduct] = useState<InventoryProduct | null>(null);
  const [changeAmount, setChangeAmount] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");

  const { data: logs = [] } = useInventoryLogs(logProduct?.id);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level);

  const openAdjust = (p: InventoryProduct) => {
    setSelected(p);
    setChangeAmount("");
    setReason("");
    setMode("add");
  };

  const handleAdjust = async () => {
    if (!selected || !changeAmount || !user) return;
    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" }); return;
    }
    try {
      await adjustStock.mutateAsync({
        productId: selected.id,
        changeAmount: mode === "add" ? amount : -amount,
        currentStock: selected.stock_quantity,
        reason: reason || (mode === "add" ? "Stock added" : "Stock removed"),
        operatedBy: user.id,
      });
      toast({ title: `Stock ${mode === "add" ? "added" : "removed"} successfully` });
      setSelected(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Track and adjust stock levels</p>
        </div>

        {/* Low stock alert banner */}
        {lowStock.length > 0 && (
          <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-warning">
                {lowStock.length} product{lowStock.length > 1 ? "s" : ""} at or below minimum stock
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lowStock.map(p => p.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        <Input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Current Stock</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Min Level</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products found</td></tr>
                ) : filtered.map(p => {
                  const isCritical = p.stock_quantity <= 0;
                  const isLow = !isCritical && p.stock_quantity <= p.min_stock_level;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{(p as InventoryProduct).categories?.name ?? "—"}</td>
                      <td className={`p-3 font-semibold ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-success"}`}>
                        {p.stock_quantity} {p.unit}
                      </td>
                      <td className="p-3 text-muted-foreground">{p.min_stock_level} {p.unit}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCritical ? "bg-destructive/10 text-destructive" :
                          isLow ? "bg-warning/10 text-warning" :
                          "bg-success/10 text-success"
                        }`}>
                          {isCritical ? "Out of Stock" : isLow ? "Low Stock" : "OK"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openAdjust(p)}>
                            Adjust
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setLogProduct(p)}>
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setMode("add")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${mode === "add" ? "bg-success text-success-foreground" : "hover:bg-secondary"}`}
              >
                <ArrowUp className="h-4 w-4" /> Add Stock
              </button>
              <button
                onClick={() => setMode("remove")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${mode === "remove" ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary"}`}
              >
                <ArrowDown className="h-4 w-4" /> Remove Stock
              </button>
            </div>

            <div className="bg-secondary/30 rounded-lg p-3 text-sm">
              Current stock: <strong>{selected?.stock_quantity} {selected?.unit}</strong>
            </div>

            <div className="space-y-1">
              <Label>Amount ({selected?.unit})</Label>
              <Input
                type="number" min="0" step="0.01"
                value={changeAmount}
                onChange={e => setChangeAmount(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. New delivery, Damaged goods…" />
            </div>

            {changeAmount && !isNaN(parseFloat(changeAmount)) && (
              <p className="text-sm text-muted-foreground">
                New stock will be:{" "}
                <strong className="text-foreground">
                  {Math.max(0, selected?.stock_quantity ?? 0 + (mode === "add" ? 1 : -1) * parseFloat(changeAmount))} {selected?.unit}
                </strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              variant={mode === "add" ? "success" : "destructive"}
              onClick={handleAdjust}
              disabled={adjustStock.isPending}
            >
              {adjustStock.isPending ? "Saving…" : `${mode === "add" ? "Add" : "Remove"} Stock`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={!!logProduct} onOpenChange={o => !o && setLogProduct(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock History — {logProduct?.name}</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No stock adjustments recorded yet.</p>
          ) : (
            <div className="space-y-2 py-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-start justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      {log.change_amount > 0
                        ? <ArrowUp className="h-3.5 w-3.5 text-success" />
                        : <ArrowDown className="h-3.5 w-3.5 text-destructive" />}
                      <span className={`font-semibold ${log.change_amount > 0 ? "text-success" : "text-destructive"}`}>
                        {log.change_amount > 0 ? "+" : ""}{log.change_amount} {logProduct?.unit}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">{log.reason || "No reason given"}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{log.previous_quantity} → {log.new_quantity}</p>
                    <p>{format(new Date(log.created_at), "MMM d, HH:mm")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
