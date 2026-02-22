import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { ShoppingCart, FileText, DollarSign, Package, LayoutDashboard, ShoppingBag, Receipt, BarChart3, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Orders",
    items: [
      { title: "My Orders", url: "/client/orders", icon: ShoppingBag },
      { title: "Invoices", url: "/client/invoices", icon: Receipt },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Reports", url: "/client/reports", icon: BarChart3 },
      { title: "Settings", url: "/client/settings", icon: Settings },
    ],
  },
];

const monthlyOrders = [
  { month: "Sep", orders: 12, amount: 4500 },
  { month: "Oct", orders: 18, amount: 6200 },
  { month: "Nov", orders: 15, amount: 5800 },
  { month: "Dec", orders: 22, amount: 8100 },
  { month: "Jan", orders: 28, amount: 9400 },
  { month: "Feb", orders: 24, amount: 8800 },
];

const categoryData = [
  { name: "Cosmetics", value: 45 },
  { name: "Household", value: 30 },
  { name: "Industrial", value: 15 },
  { name: "Personal Care", value: 10 },
];

const COLORS = ["hsl(220,60%,20%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(210,80%,55%)"];

const recentOrders = [
  { id: "ORD-2024-0142", product: "Anti-Bacterial Soap Base", qty: "500 L", status: "Delivered", total: "$2,450" },
  { id: "ORD-2024-0138", product: "Moisturizing Cream Blend", qty: "200 kg", status: "Processing", total: "$3,800" },
  { id: "ORD-2024-0135", product: "Floor Cleaner Concentrate", qty: "1,000 L", status: "Shipped", total: "$1,200" },
  { id: "ORD-2024-0130", product: "Shampoo Formula SH-12", qty: "300 L", status: "Delivered", total: "$2,100" },
  { id: "ORD-2024-0127", product: "Disinfectant Solution D5", qty: "800 L", status: "Delivered", total: "$960" },
];

const statusColor: Record<string, string> = {
  Delivered: "bg-success/10 text-success",
  Processing: "bg-warning/10 text-warning",
  Shipped: "bg-info/10 text-info",
};

const ClientDashboard = () => {
  return (
    <DashboardLayout
      navGroups={navGroups}
      portalName="Client Portal"
      userName="Acme Corp"
      userRole="Premium Client"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Welcome back, Acme Corp</h1>
          <p className="text-muted-foreground text-sm">Here's an overview of your account activity.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Orders" value="142" change="+12% this month" changeType="positive" icon={ShoppingCart} />
          <StatCard title="Pending Invoices" value="5" change="3 due this week" changeType="negative" icon={FileText} />
          <StatCard title="Total Spent" value="$48,200" change="+8.2% vs last month" changeType="positive" icon={DollarSign} />
          <StatCard title="Products Ordered" value="23" change="4 categories" changeType="neutral" icon={Package} />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Spending Trend */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Spending Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyOrders}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="hsl(38,92%,50%)" fill="url(#colorAmount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-display font-semibold">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Quantity</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{order.id}</td>
                    <td className="p-3 font-medium">{order.product}</td>
                    <td className="p-3 text-muted-foreground">{order.qty}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium">{order.total}</td>
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
