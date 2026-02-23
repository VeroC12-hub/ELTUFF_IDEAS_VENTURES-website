import { useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useAllOrders } from "@/hooks/useOrders";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useInventoryProducts } from "@/hooks/useInventory";
import { useClients } from "@/hooks/useClients";
import {
  LayoutDashboard, Users, Package, Receipt, FileText, BarChart3,
  Settings, DollarSign, AlertTriangle, ShoppingCart,
  UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance", items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System", items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const COLORS = ["hsl(145,45%,22%)", "hsl(42,85%,50%)", "hsl(152,60%,40%)", "hsl(210,80%,55%)", "hsl(340,65%,55%)"];

const invoiceStatusColor: Record<string, string> = {
  draft:     "bg-secondary text-secondary-foreground",
  sent:      "bg-info/10 text-info",
  paid:      "bg-success/10 text-success",
  overdue:   "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const StaffDashboard = () => {
  const { profile, role } = useAuth();
  const displayName = profile?.full_name || "Staff";
  const isAdmin = role === "admin";

  const { data: orders = [], isLoading: ordersLoading } = useAllOrders();
  const { data: invoices = [] } = useAllInvoices();
  const { data: products = [] } = useInventoryProducts();
  const { data: clients = [] } = useClients();

  // ── Stats ──────────────────────────────────────────────────────────────────
  const thisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= start && d <= end && o.status !== "cancelled";
    });
  }, [orders]);

  const monthlyRevenue = thisMonth.reduce((s, o) => s + o.total_amount, 0);
  const pendingOrders  = orders.filter(o => o.status === "pending").length;
  const lowStockCount  = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
  const criticalCount  = products.filter(p => p.stock_quantity <= 0).length;

  // ── Monthly revenue chart (last 6 months) ──────────────────────────────────
  const revenueChart = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date  = subMonths(new Date(), 5 - i);
      const start = startOfMonth(date);
      const end   = endOfMonth(date);
      const revenue = orders
        .filter(o => {
          const d = new Date(o.created_at);
          return d >= start && d <= end && o.status !== "cancelled";
        })
        .reduce((s, o) => s + o.total_amount, 0);
      return { month: format(date, "MMM"), revenue };
    });
  }, [orders]);

  // ── Product mix from order items ───────────────────────────────────────────
  const productMix = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o =>
      (o.order_items ?? []).forEach(item => {
        const cat = (item as typeof item & { products?: { categories?: { name: string } | null } | null })
          .products?.categories?.name ?? "Other";
        map[cat] = (map[cat] ?? 0) + item.total_price;
      })
    );
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);

  // ── Top clients ────────────────────────────────────────────────────────────
  const topClients = useMemo(() =>
    [...clients]
      .sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0))
      .slice(0, 5),
    [clients]
  );

  // ── Low stock items ────────────────────────────────────────────────────────
  const lowStockItems = products
    .filter(p => p.stock_quantity <= p.min_stock_level)
    .slice(0, 5);

  // ── Recent invoices ────────────────────────────────────────────────────────
  const recentInvoices = invoices.slice(0, 5);

  return (
    <DashboardLayout navGroups={navGroups} portalName={isAdmin ? "Admin Portal" : "Staff Portal"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{isAdmin ? "Admin" : "Staff"} Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {displayName}. Here's your operations overview.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Monthly Revenue"
            value={`₵ ${monthlyRevenue.toFixed(2)}`}
            change={`${thisMonth.length} orders this month`}
            changeType="positive"
            icon={DollarSign}
          />
          <StatCard
            title="Active Clients"
            value={String(clients.length)}
            change="Registered clients"
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Pending Orders"
            value={String(pendingOrders)}
            change={pendingOrders > 0 ? "Needs attention" : "All clear"}
            changeType={pendingOrders > 0 ? "negative" : "positive"}
            icon={FileText}
          />
          <StatCard
            title="Low Stock Items"
            value={String(lowStockCount)}
            change={criticalCount > 0 ? `${criticalCount} out of stock` : "Monitor inventory"}
            changeType={lowStockCount > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₵ ${v.toFixed(2)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(145,45%,22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Product Mix</h3>
            {productMix.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No order data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={productMix} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {productMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {productMix.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-medium">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top clients + Recent invoices */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">Top Clients</h3>
              <Link to="/staff/clients" className="text-xs text-primary hover:underline font-medium">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.length === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-xs">No clients yet</td></tr>
                  ) : topClients.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">
                        {c.full_name || c.email}
                        {c.company_name && <p className="text-xs text-muted-foreground">{c.company_name}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground">{c.order_count ?? 0}</td>
                      <td className="p-3 text-right font-medium">₵ {(c.total_spent ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">Recent Invoices</h3>
              <Link to="/staff/invoices" className="text-xs text-primary hover:underline font-medium">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No invoices yet</td></tr>
                  ) : recentInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="p-3 text-sm">{inv.profiles?.full_name || inv.profiles?.email || "—"}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invoiceStatusColor[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">₵ {inv.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h3 className="font-display font-semibold">Low Stock Alerts</h3>
              </div>
              <Link to="/staff/inventory" className="text-xs text-primary hover:underline font-medium">Manage</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Current Stock</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Min Level</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map(p => {
                    const isCritical = p.stock_quantity <= 0;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className={`p-3 font-semibold ${isCritical ? "text-destructive" : "text-warning"}`}>
                          {p.stock_quantity} {p.unit}
                        </td>
                        <td className="p-3 text-muted-foreground">{p.min_stock_level} {p.unit}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCritical ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                          }`}>
                            {isCritical ? "Out of Stock" : "Low"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
