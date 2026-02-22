import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import {
  LayoutDashboard, Users, Package, Receipt, FileText, BarChart3,
  Settings, DollarSign, TrendingUp, ShoppingCart, AlertTriangle,
  UserPlus, Warehouse, CreditCard, ClipboardList
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from "recharts";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Quotes", url: "/staff/quotes", icon: ClipboardList },
      { title: "Invoices", url: "/staff/invoices", icon: Receipt },
      { title: "Orders", url: "/staff/orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Clients", url: "/staff/clients", icon: Users },
      { title: "Inventory", url: "/staff/inventory", icon: Warehouse },
      { title: "Products", url: "/staff/products", icon: Package },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Accounts", url: "/staff/accounts", icon: CreditCard },
      { title: "Reports", url: "/staff/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Team", url: "/staff/team", icon: UserPlus },
      { title: "Settings", url: "/staff/settings", icon: Settings },
    ],
  },
];

const revenueData = [
  { month: "Sep", revenue: 32000, costs: 18000, profit: 14000 },
  { month: "Oct", revenue: 38000, costs: 20000, profit: 18000 },
  { month: "Nov", revenue: 35000, costs: 19000, profit: 16000 },
  { month: "Dec", revenue: 45000, costs: 22000, profit: 23000 },
  { month: "Jan", revenue: 52000, costs: 25000, profit: 27000 },
  { month: "Feb", revenue: 48000, costs: 23000, profit: 25000 },
];

const productMix = [
  { name: "Soaps & Detergents", value: 35 },
  { name: "Skin Care", value: 25 },
  { name: "Hair Care", value: 20 },
  { name: "Disinfectants", value: 12 },
  { name: "Industrial", value: 8 },
];

const COLORS = ["hsl(220,60%,20%)", "hsl(38,92%,50%)", "hsl(152,60%,40%)", "hsl(210,80%,55%)", "hsl(340,65%,55%)"];

const topClients = [
  { name: "Acme Corp", orders: 42, revenue: "$18,400", trend: "+12%" },
  { name: "BrightClean Ltd", orders: 38, revenue: "$15,600", trend: "+8%" },
  { name: "PureSkin Co", orders: 31, revenue: "$14,200", trend: "+15%" },
  { name: "HomeFresh Inc", orders: 27, revenue: "$11,800", trend: "-3%" },
  { name: "GlowUp Beauty", orders: 24, revenue: "$10,500", trend: "+22%" },
];

const lowStockItems = [
  { product: "Sodium Lauryl Sulfate", stock: "45 kg", threshold: "100 kg", status: "Critical" },
  { product: "Glycerin USP", stock: "120 L", threshold: "200 L", status: "Low" },
  { product: "Fragrance Oil FO-22", stock: "15 L", threshold: "50 L", status: "Critical" },
  { product: "Citric Acid", stock: "80 kg", threshold: "150 kg", status: "Low" },
];

const recentInvoices = [
  { id: "INV-2024-0089", client: "Acme Corp", amount: "$3,400", status: "Paid", date: "Feb 18" },
  { id: "INV-2024-0088", client: "BrightClean Ltd", amount: "$2,800", status: "Pending", date: "Feb 16" },
  { id: "INV-2024-0087", client: "PureSkin Co", amount: "$5,200", status: "Overdue", date: "Feb 10" },
  { id: "INV-2024-0086", client: "HomeFresh Inc", amount: "$1,900", status: "Paid", date: "Feb 8" },
  { id: "INV-2024-0085", client: "GlowUp Beauty", amount: "$4,100", status: "Paid", date: "Feb 5" },
];

const invoiceStatusColor: Record<string, string> = {
  Paid: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Overdue: "bg-destructive/10 text-destructive",
};

const stockStatusColor: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive",
  Low: "bg-warning/10 text-warning",
};

const StaffDashboard = () => {
  return (
    <DashboardLayout
      navGroups={navGroups}
      portalName="Staff Portal"
      userName="Sarah Johnson"
      userRole="Sales Manager"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Staff Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of sales, inventory, and operations.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Monthly Revenue" value="$48,200" change="+14.5% vs last month" changeType="positive" icon={DollarSign} />
          <StatCard title="Active Clients" value="87" change="+5 new this month" changeType="positive" icon={Users} />
          <StatCard title="Pending Quotes" value="12" change="4 expire this week" changeType="negative" icon={FileText} />
          <StatCard title="Low Stock Items" value="4" change="2 critical" changeType="negative" icon={AlertTriangle} />
        </div>

        {/* Revenue Chart + Product Mix */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Revenue vs Costs</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,90%)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(220,60%,20%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costs" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Product Mix</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={productMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {productMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {productMix.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Clients */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold">Top Clients</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((client) => (
                    <tr key={client.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 text-muted-foreground">{client.orders}</td>
                      <td className="p-3 text-right font-medium">{client.revenue}</td>
                      <td className={`p-3 text-right text-xs font-medium ${client.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                        {client.trend}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold">Recent Invoices</h3>
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
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{inv.id}</td>
                      <td className="p-3">{inv.client}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusColor[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{inv.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display font-semibold">Low Stock Alerts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Current Stock</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Min Threshold</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.product} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{item.product}</td>
                    <td className="p-3 text-muted-foreground">{item.stock}</td>
                    <td className="p-3 text-muted-foreground">{item.threshold}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stockStatusColor[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
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

export default StaffDashboard;
