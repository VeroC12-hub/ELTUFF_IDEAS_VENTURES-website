import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAllOrders } from "@/hooks/useOrders";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import {
  LayoutDashboard, Users, Package, Receipt, FileText, BarChart3,
  Settings, DollarSign, ShoppingCart, UserPlus, Warehouse,
  CreditCard, ClipboardList, TrendingUp, TrendingDown, Calendar,
  FlaskConical, BookOpen, Calculator } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  subMonths, subDays, startOfDay, isAfter,
  format, startOfMonth, endOfMonth,
} from "date-fns";

// ── Nav (shared across staff pages) ───────────────────────────────────────────
const navGroups = [
  { label: "Overview",    items: [{ title: "Dashboard",  url: "/staff/dashboard",  icon: LayoutDashboard }] },
  { label: "Sales",       items: [{ title: "Quotes",     url: "/staff/quotes",     icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management",  items: [{ title: "Clients",    url: "/staff/clients",    icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",     items: [{ title: "Accounts",   url: "/staff/accounts",   icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",      items: [{ title: "Team",       url: "/staff/team",       icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

// ── Date range options ─────────────────────────────────────────────────────────
const RANGES = [
  { label: "Last 30 days",  days: 30  },
  { label: "Last 3 months", days: 90  },
  { label: "Last 6 months", days: 180 },
  { label: "Last 12 months",days: 365 },
  { label: "All time",      days: 0   },
] as const;

type Range = typeof RANGES[number];

function cutoff(days: number): Date {
  if (days === 0) return new Date("2000-01-01");
  return startOfDay(subDays(new Date(), days));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StaffReportsPage() {
  const [range, setRange] = useState<Range>(RANGES[2]); // default: last 6 months

  const { data: allOrders   = [] } = useAllOrders();
  const { data: allInvoices = [] } = useAllInvoices();
  const { data: clients     = [] } = useClients();

  const from = cutoff(range.days);

  // ── Filter to selected range ────────────────────────────────────────────────
  const orders   = useMemo(() => allOrders.filter(o   => isAfter(new Date(o.created_at),   from)), [allOrders,   from]);
  const invoices = useMemo(() => allInvoices.filter(i => isAfter(new Date(i.created_at),   from)), [allInvoices, from]);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0),
    [orders]
  );

  const totalOrders = orders.length;

  const outstandingAmount = useMemo(
    () => invoices
      .filter(i => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + i.total_amount, 0),
    [invoices]
  );

  const newClientsCount = useMemo(() => {
    if (range.days === 0) return clients.length;
    return clients.filter(c => isAfter(new Date(c.created_at), from)).length;
  }, [clients, from, range.days]);

  // ── Period-over-period comparison (vs previous same-length window) ──────────
  const prevFrom = useMemo(() => {
    if (range.days === 0) return new Date("2000-01-01");
    return cutoff(range.days * 2);
  }, [range.days]);

  const prevOrders = useMemo(
    () => allOrders.filter(o => {
      const d = new Date(o.created_at);
      return isAfter(d, prevFrom) && !isAfter(d, from);
    }),
    [allOrders, prevFrom, from]
  );

  const prevRevenue = prevOrders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.total_amount, 0);

  const revenueChange = prevRevenue === 0
    ? null
    : ((totalRevenue - prevRevenue) / prevRevenue) * 100;

  const prevOrderCount = prevOrders.length;
  const orderChange = prevOrderCount === 0
    ? null
    : ((totalOrders - prevOrderCount) / prevOrderCount) * 100;

  // ── 12-month revenue + order count chart ────────────────────────────────────
  const monthlyChart = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date  = subMonths(new Date(), 11 - i);
      const start = startOfMonth(date);
      const end   = endOfMonth(date);
      const monthOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      });
      const revenue = monthOrders
        .filter(o => o.status !== "cancelled")
        .reduce((s, o) => s + o.total_amount, 0);
      return {
        month:   format(date, "MMM yy"),
        revenue,
        orders:  monthOrders.length,
        cancelled: monthOrders.filter(o => o.status === "cancelled").length,
      };
    });
  }, [allOrders]);

  // ── Monthly breakdown table (same 12 months, sorted newest first) ────────────
  const monthlyTable = useMemo(() => [...monthlyChart].reverse(), [monthlyChart]);

  const grandTotal    = monthlyChart.reduce((s, m) => s + m.revenue, 0);
  const grandOrders   = monthlyChart.reduce((s, m) => s + m.orders,  0);

  // ── Invoice status breakdown ────────────────────────────────────────────────
  const INV_COLORS: Record<string, string> = {
    paid:      "hsl(152,60%,40%)",
    sent:      "hsl(210,80%,55%)",
    overdue:   "hsl(0,72%,51%)",
    draft:     "hsl(220,14%,60%)",
    cancelled: "hsl(220,14%,75%)",
  };

  const invoiceStatusData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    allInvoices.forEach(i => {
      if (!map[i.status]) map[i.status] = { count: 0, amount: 0 };
      map[i.status].count  += 1;
      map[i.status].amount += i.total_amount;
    });
    return Object.entries(map).map(([status, v]) => ({
      status,
      count:  v.count,
      amount: v.amount,
    }));
  }, [allInvoices]);

  // ── Invoice aging (outstanding only — sent + overdue) ───────────────────────
  const agingBuckets = useMemo(() => {
    const today = new Date();
    const buckets = [
      { label: "Current (0–30 days)",  min: 0,  max: 30,  items: [] as typeof allInvoices },
      { label: "31–60 days",           min: 31, max: 60,  items: [] as typeof allInvoices },
      { label: "61–90 days",           min: 61, max: 90,  items: [] as typeof allInvoices },
      { label: "Over 90 days",         min: 91, max: Infinity, items: [] as typeof allInvoices },
    ];

    allInvoices
      .filter(i => i.status === "sent" || i.status === "overdue")
      .forEach(inv => {
        const daysOld = Math.floor(
          (today.getTime() - new Date(inv.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const bucket = buckets.find(b => daysOld >= b.min && daysOld <= b.max);
        if (bucket) bucket.items.push(inv);
      });

    return buckets.map(b => ({
      label:  b.label,
      count:  b.items.length,
      amount: b.items.reduce((s, i) => s + i.total_amount, 0),
    }));
  }, [allInvoices]);

  const totalOutstanding = agingBuckets.reduce((s, b) => s + b.amount, 0);

  // ── Order status breakdown ──────────────────────────────────────────────────
  const ORDER_COLORS: Record<string, string> = {
    pending:    "hsl(42,85%,50%)",
    processing: "hsl(210,80%,55%)",
    shipped:    "hsl(145,45%,22%)",
    delivered:  "hsl(152,60%,40%)",
    cancelled:  "hsl(0,72%,51%)",
  };

  const orderStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // ── Top products by revenue (from order items in filtered range) ────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders
      .filter(o => o.status !== "cancelled")
      .forEach(o =>
        (o.order_items ?? []).forEach(item => {
          const name = item.products?.name ?? "Unknown";
          if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
          map[name].qty     += Number(item.quantity);
          map[name].revenue += item.total_price;
        })
      );
    const total = Object.values(map).reduce((s, v) => s + v.revenue, 0) || 1;
    return Object.values(map)
      .map(v => ({ ...v, pct: (v.revenue / total) * 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orders]);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* ── Header + date range filter ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Business performance overview</p>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 flex-wrap">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5 shrink-0" />
            {RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  range.label === r.label
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Summary stat cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={`₵ ${totalRevenue.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={
              revenueChange === null
                ? "No prior period data"
                : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prev period`
            }
            changeType={revenueChange === null ? "neutral" : revenueChange >= 0 ? "positive" : "negative"}
            icon={DollarSign}
          />
          <StatCard
            title="Total Orders"
            value={String(totalOrders)}
            change={
              orderChange === null
                ? "No prior period data"
                : `${orderChange >= 0 ? "+" : ""}${orderChange.toFixed(1)}% vs prev period`
            }
            changeType={orderChange === null ? "neutral" : orderChange >= 0 ? "positive" : "negative"}
            icon={ShoppingCart}
          />
          <StatCard
            title="Outstanding"
            value={`₵ ${outstandingAmount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={
              invoices.filter(i => i.status === "overdue").length > 0
                ? `${invoices.filter(i => i.status === "overdue").length} overdue`
                : "All invoices current"
            }
            changeType={invoices.filter(i => i.status === "overdue").length > 0 ? "negative" : "positive"}
            icon={FileText}
          />
          <StatCard
            title={range.days === 0 ? "Total Clients" : "New Clients"}
            value={String(newClientsCount)}
            change={range.days === 0 ? "All registered" : `In selected period`}
            changeType="neutral"
            icon={Users}
          />
        </div>

        {/* ── Period comparison mini-cards ────────────────────────────────── */}
        {range.days > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${revenueChange !== null && revenueChange >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                {revenueChange !== null && revenueChange >= 0
                  ? <TrendingUp className="h-5 w-5 text-success" />
                  : <TrendingDown className="h-5 w-5 text-destructive" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue vs previous {range.label.toLowerCase()}</p>
                <p className="text-sm font-semibold mt-0.5">
                  This period: <span className="text-foreground">₵ {totalRevenue.toFixed(2)}</span>
                  <span className="text-muted-foreground font-normal mx-1">·</span>
                  Prev: <span className="text-muted-foreground">₵ {prevRevenue.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${orderChange !== null && orderChange >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                {orderChange !== null && orderChange >= 0
                  ? <TrendingUp className="h-5 w-5 text-success" />
                  : <TrendingDown className="h-5 w-5 text-destructive" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orders vs previous {range.label.toLowerCase()}</p>
                <p className="text-sm font-semibold mt-0.5">
                  This period: <span className="text-foreground">{totalOrders}</span>
                  <span className="text-muted-foreground font-normal mx-1">·</span>
                  Prev: <span className="text-muted-foreground">{prevOrderCount}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 12-month revenue bar chart ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Revenue — Last 12 Months</h3>
            <span className="text-xs text-muted-foreground">
              Total: ₵ {grandTotal.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChart} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  name === "revenue" ? `₵ ${v.toFixed(2)}` : v,
                  name === "revenue" ? "Revenue" : "Orders",
                ]}
              />
              <Legend
                formatter={name => name === "revenue" ? "Revenue (₵)" : "Orders"}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="hsl(145,45%,22%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="orders"  fill="hsl(42,85%,50%)"  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Invoice status pie + aging ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Invoice status pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Invoice Status Breakdown</h3>
            {invoiceStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No invoices yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {invoiceStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={INV_COLORS[entry.status] ?? "hsl(220,14%,70%)"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _: string, props: { payload?: { status?: string; amount?: number } }) => [
                        `${v} invoice${v !== 1 ? "s" : ""} · ₵ ${(props.payload?.amount ?? 0).toFixed(2)}`,
                        props.payload?.status ?? "",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {invoiceStatusData.map(entry => (
                    <div key={entry.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: INV_COLORS[entry.status] ?? "hsl(220,14%,70%)" }}
                        />
                        <span className="capitalize text-muted-foreground">{entry.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{entry.count}</span>
                        <span className="font-medium w-24 text-right">₵ {entry.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Invoice aging */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">Invoice Aging</h3>
              <span className="text-xs text-muted-foreground">Outstanding only</span>
            </div>
            {totalOutstanding === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No outstanding invoices
              </div>
            ) : (
              <div className="divide-y divide-border">
                {agingBuckets.map(b => {
                  const pct = totalOutstanding > 0 ? (b.amount / totalOutstanding) * 100 : 0;
                  const isRisk = b.label.startsWith("61") || b.label.startsWith("Over");
                  return (
                    <div key={b.label} className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${isRisk && b.amount > 0 ? "text-destructive" : ""}`}>
                          {b.label}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">₵ {b.amount.toFixed(2)}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            ({b.count} inv.)
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isRisk && b.amount > 0 ? "bg-destructive" : "bg-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total outstanding</p>
                    </div>
                  );
                })}
                <div className="p-4 bg-muted/30 flex items-center justify-between text-sm font-semibold">
                  <span>Total Outstanding</span>
                  <span>₵ {totalOutstanding.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Monthly breakdown table ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">Monthly Breakdown</h3>
            <span className="text-xs text-muted-foreground">{grandOrders} orders over 12 months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cancelled</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTable.map(m => {
                  const completed = m.orders - m.cancelled;
                  const avg = completed > 0 ? m.revenue / completed : 0;
                  return (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{m.month}</td>
                      <td className="p-3 text-right text-muted-foreground">{m.orders}</td>
                      <td className="p-3 text-right">
                        {m.cancelled > 0
                          ? <span className="text-destructive font-medium">{m.cancelled}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {m.revenue > 0 ? `₵ ${m.revenue.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {avg > 0 ? `₵ ${avg.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold border-t border-border">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{grandOrders}</td>
                  <td className="p-3 text-right text-destructive">
                    {monthlyChart.reduce((s, m) => s + m.cancelled, 0) || "—"}
                  </td>
                  <td className="p-3 text-right">₵ {grandTotal.toFixed(2)}</td>
                  <td className="p-3 text-right text-muted-foreground">
                    {grandOrders > 0 ? `₵ ${(grandTotal / grandOrders).toFixed(2)}` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Top clients ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">Top Clients by Spend</h3>
            <span className="text-xs text-muted-foreground">All time · {clients.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Avg Order</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">
                      No clients yet
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const sorted = [...clients]
                      .sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0))
                      .slice(0, 10);
                    const grandSpend = sorted.reduce((s, c) => s + (c.total_spent ?? 0), 0) || 1;
                    return sorted.map((c, i) => {
                      const spent = c.total_spent ?? 0;
                      const orders = c.order_count ?? 0;
                      const avg = orders > 0 ? spent / orders : 0;
                      const share = ((spent / grandSpend) * 100).toFixed(1);
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-muted-foreground font-bold text-xs">#{i + 1}</td>
                          <td className="p-3">
                            <p className="font-medium">{c.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{c.company_name || "—"}</td>
                          <td className="p-3 text-right text-muted-foreground">{orders}</td>
                          <td className="p-3 text-right font-semibold">₵ {spent.toFixed(2)}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {avg > 0 ? `₵ ${avg.toFixed(2)}` : "—"}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Order status + top products ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Order status breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Order Status Breakdown</h3>
            {orderStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No orders in this period
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {orderStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={ORDER_COLORS[entry.status] ?? "hsl(220,14%,70%)"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _: string, props: { payload?: { status?: string } }) => [
                        `${v} order${v !== 1 ? "s" : ""}`,
                        props.payload?.status ?? "",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {orderStatusData.map(entry => {
                    const pct = orders.length > 0
                      ? ((entry.count / orders.length) * 100).toFixed(1)
                      : "0";
                    return (
                      <div key={entry.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: ORDER_COLORS[entry.status] ?? "hsl(220,14%,70%)" }}
                          />
                          <span className="capitalize text-muted-foreground">{entry.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground w-16 text-right">{pct}%</span>
                          <span className="font-medium w-8 text-right">{entry.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Top products by revenue */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">Top Products by Revenue</h3>
              <span className="text-xs text-muted-foreground">{range.label}</span>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No product sales in this period
              </div>
            ) : (
              <div className="divide-y divide-border">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">
                          #{i + 1}
                        </span>
                        <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold">₵ {p.revenue.toFixed(2)}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {p.qty % 1 === 0 ? p.qty : p.qty.toFixed(2)} units
                        </span>
                      </div>
                    </div>
                    {/* Revenue share bar */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{p.pct.toFixed(1)}% of period revenue</p>
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
