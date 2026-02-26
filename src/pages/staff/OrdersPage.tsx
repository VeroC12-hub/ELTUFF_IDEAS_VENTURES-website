import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAllOrders, useUpdateOrderStatus, Order } from "@/hooks/useOrders";
import { LayoutDashboard, Package, PackageOpen, Warehouse, Users, Receipt, ShoppingCart, ClipboardList, BarChart3, Settings, UserPlus, CreditCard, ChevronDown , FlaskConical, BookOpen, Calculator } from "lucide-react";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }, { title: "Bottles & Labels", url: "/staff/bottles-labels", icon: PackageOpen }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance", items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System", items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const statusColor: Record<string, string> = {
  pending:    "bg-warning/10 text-warning",
  processing: "bg-info/10 text-info",
  shipped:    "bg-primary/10 text-primary",
  delivered:  "bg-success/10 text-success",
  cancelled:  "bg-destructive/10 text-destructive",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = orders.filter(o => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles?.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status });
      toast({ title: `Order marked as ${status}` });
      // Update selected if open
      if (selected?.id === orderId) setSelected(o => o ? { ...o, status } : o);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const totalRevenue = orders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.total_amount, 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">{orders.length} total orders</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map(s => {
            const count = orders.filter(o => o.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  filterStatus === s ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <p className="text-xs text-muted-foreground capitalize">{s}</p>
                <p className="text-xl font-bold mt-0.5">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search order # or client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Order #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Items</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                ) : filtered.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{order.order_number}</td>
                    <td className="p-3">
                      <p className="font-medium">{order.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{order.profiles?.company_name || order.profiles?.email}</p>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      ₵ {order.total_amount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <Select value={order.status} onValueChange={v => handleStatusChange(order.id, v)}>
                        <SelectTrigger className={`h-7 text-xs w-32 font-medium border-0 ${statusColor[order.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelected(order)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="p-3 text-sm text-muted-foreground">
                      {filtered.length} order{filtered.length !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3 text-right font-bold">
                      ₵ {filtered.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0).toFixed(2)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.order_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              {/* Client + status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{selected.profiles?.full_name || "Unknown client"}</p>
                  <p className="text-sm text-muted-foreground">{selected.profiles?.email}</p>
                  {selected.profiles?.company_name && (
                    <p className="text-xs text-muted-foreground">{selected.profiles.company_name}</p>
                  )}
                </div>
                <Select value={selected.status} onValueChange={v => handleStatusChange(selected.id, v)}>
                  <SelectTrigger className={`h-8 text-xs w-36 font-medium ${statusColor[selected.status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground">
                Placed {format(new Date(selected.created_at), "MMMM d, yyyy 'at' HH:mm")}
              </div>

              {/* Items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  ORDER ITEMS
                </div>
                {(selected.order_items ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No items</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(selected.order_items ?? []).map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{item.products?.name ?? "Product"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {item.products?.unit} × ₵ {item.unit_price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">₵ {item.total_price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between px-3 py-2.5 bg-muted/30 text-sm font-bold border-t border-border">
                  <span>Total</span>
                  <span>₵ {selected.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Shipping + notes */}
              {selected.shipping_address && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">SHIPPING ADDRESS</p>
                  <p>{selected.shipping_address}</p>
                </div>
              )}
              {selected.notes && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">NOTES</p>
                  <p className="text-muted-foreground">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
