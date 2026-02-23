import { useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrders } from "@/hooks/useOrders";
import { useMyInvoices } from "@/hooks/useInvoices";
import { ShoppingCart, FileText, DollarSign, Package, LayoutDashboard, ShoppingBag, Receipt, BarChart3, Settings } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard }] },
  { label: "Orders", items: [{ title: "My Orders", url: "/client/orders", icon: ShoppingBag }, { title: "Invoices", url: "/client/invoices", icon: Receipt }] },
  { label: "Analytics", items: [{ title: "Reports", url: "/client/reports", icon: BarChart3 }, { title: "Settings", url: "/client/settings", icon: Settings }] },
];

const COLORS = ["hsl(145,45%,22%)", "hsl(42,85%,50%)", "hsl(152,60%,40%)", "hsl(210,80%,55%)"];

const statusColor: Record<string, string> = {
  pending:    "bg-warning/10 text-warning",
  processing: "bg-info/10 text-info",
  shipped:    "bg-primary/10 text-primary",
  delivered:  "bg-success/10 text-success",
  cancelled:  "bg-destructive/10 text-destructive",
};

const ClientDashboard = () => {
  const { profile } = useAuth();
  const displayName = profile?.full_name || profile?.email || "User";
  const { data: orders = [], isLoading: ordersLoading } = useMyOrders();
  const { data: invoices = [] } = useMyInvoices();

  // Stats
  const totalSpent = orders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.total_amount, 0);

  const pendingInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue").length;

  const uniqueProducts = new Set(
    orders.flatMap(o => (o.order_items ?? []).map(i => i.product_id))
  ).size;

  // Spending trend — last 6 months
  const spendingTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const amount = orders
        .filter(o => {
          const d = new Date(o.created_at);
          return d >= start && d <= end && o.status !== "cancelled";
        })
        .reduce((s, o) => s + o.total_amount, 0);
      return { month: format(date, "MMM"), amount };
    });
  }, [orders]);

  // Category breakdown from order items
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o =>
      (o.order_items ?? []).forEach(item => {
        const cat = (item as typeof item & { products?: { categories?: { name: string } | null } | null })
          .products?.categories?.name ?? "Other";
        map[cat] = (map[cat] ?? 0) + item.total_price;
      })
    );
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round((value / total) * 100),
    }));
  }, [orders]);

  // 5 most recent orders
  const recentOrders = orders.slice(0, 5);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Client Portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Welcome back, {displayName}</h1>
          <p className="text-muted-foreground text-sm">Here's an overview of your account activity.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={String(orders.length)}
            change={orders.length > 0 ? `${orders.filter(o => o.status === "delivered").length} delivered` : "No orders yet"}
            changeType="positive"
            icon={ShoppingCart}
          />
          <StatCard
            title="Pending Invoices"
            value={String(pendingInvoices)}
            change={pendingInvoices > 0 ? "Action required" : "All clear"}
            changeType={pendingInvoices > 0 ? "negative" : "positive"}
            icon={FileText}
          />
          <StatCard
            title="Total Spent"
            value={`₵ ${totalSpent.toFixed(2)}`}
            change="All time"
            changeType="neutral"
            icon={DollarSign}
          />
          <StatCard
            title="Products Ordered"
            value={String(uniqueProducts)}
            change="Unique products"
            changeType="neutral"
            icon={Package}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Spending Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={spendingTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(42,85%,50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(42,85%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₵${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₵ ${v.toFixed(2)}`, "Spent"]} />
                <Area type="monotone" dataKey="amount" stroke="hsl(42,85%,50%)" fill="url(#colorAmount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">By Category</h3>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">No orders yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {categoryBreakdown.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
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

        {/* Recent orders */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">Recent Orders</h3>
            <Link to="/client/orders" className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Order #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Items</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No orders yet —{" "}
                      <Link to="/" className="text-primary hover:underline">browse our products</Link>
                    </td>
                  </tr>
                ) : recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{order.order_number}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">₵ {order.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
