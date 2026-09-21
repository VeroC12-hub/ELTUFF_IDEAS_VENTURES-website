import { useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useAllProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import retailNavGroups from "@/lib/retailNavGroups";
import { Barcode, Receipt, Users, BarChart3, AlertTriangle } from "lucide-react";

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export default function RetailDashboard() {
  const { user, role, profile } = useAuth();
  const { data: invoices = [] } = useAllInvoices();
  const { data: products = [] } = useAllProducts();
  const isAdmin = role === "admin";

  const todaysRetail = useMemo(
    () => invoices.filter(i =>
      (i as any).channel === "retail" &&
      i.status === "paid" &&
      isToday(i.created_at) &&
      (isAdmin || (i as any).sold_by === user?.id)
    ),
    [invoices, isAdmin, user?.id]
  );

  const todaysTotal = todaysRetail.reduce((s, i) => s + i.total_amount, 0);

  const topItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inv of todaysRetail) {
      for (const item of inv.invoice_items ?? []) {
        counts.set(item.description, (counts.get(item.description) ?? 0) + item.quantity);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [todaysRetail]);

  const lowStock = useMemo(
    () => products.filter(p => p.is_active && p.stock_quantity <= p.min_stock_level),
    [products]
  );

  const quickLinks = [
    { title: "New Sale", url: "/retail/sale", icon: Barcode },
    { title: "Receipts", url: "/retail/receipts", icon: Receipt },
    { title: "Customers", url: "/retail/customers", icon: Users },
    ...(isAdmin ? [{ title: "Reports", url: "/retail/reports", icon: BarChart3 }] : []),
  ];

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {isAdmin ? "Retail Dashboard (All Staff)" : `${profile?.full_name || "My"} Dashboard`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Today's shop activity across everyone" : "Your sales today"}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(l => (
            <Link
              key={l.url}
              to={l.url}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <l.icon className="h-4.5 w-4.5" />
              </div>
              <span className="font-medium text-sm">{l.title}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">{isAdmin ? "Today's Sales (Total)" : "Your Sales Today"}</p>
            <p className="text-2xl font-bold">₵ {todaysTotal.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Transactions Today</p>
            <p className="text-2xl font-bold">{todaysRetail.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Low Stock Items</p>
            <p className={`text-2xl font-bold ${lowStock.length > 0 ? "text-destructive" : ""}`}>{lowStock.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3">{isAdmin ? "Top Sellers Today" : "Your Top Sellers Today"}</h2>
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet today</p>
            ) : (
              <div className="space-y-2">
                {topItems.map(([name, qty]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium text-muted-foreground shrink-0 ml-2">{qty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock
            </h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stocked up</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="font-medium text-destructive shrink-0 ml-2">{p.stock_quantity} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
