import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useMyOrders } from "@/hooks/useOrders";
import { useMyInvoices } from "@/hooks/useInvoices";
import {
  LayoutDashboard, ShoppingBag, Receipt, BarChart3,
  Settings, DollarSign, ShoppingCart, FileText, Package,
  Calendar, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  subDays, subMonths, startOfDay, startOfMonth, endOfMonth,
  isAfter, format,
} from "date-fns";

// ── Nav ───────────────────────────────────────────────────────────────────────
const navGroups = [
  { label: "Overview",   items: [{ title: "Dashboard", url: "/client/dashboard",  icon: LayoutDashboard }] },
  { label: "Orders",     items: [{ title: "My Orders", url: "/client/orders",     icon: ShoppingBag }, { title: "Invoices", url: "/client/invoices", icon: Receipt }] },
  { label: "Analytics",  items: [{ title: "Reports",   url: "/client/reports",    icon: BarChart3 }, { title: "Settings", url: "/client/settings", icon: Settings }] },
];

// ── Date range ────────────────────────────────────────────────────────────────
const RANGES = [
  { label: "Last 30 days",   days: 30  },
  { label: "Last 3 months",  days: 90  },
  { label: "Last 6 months",  days: 180 },
  { label: "Last 12 months", days: 365 },
  { label: "All time",       days: 0   },
] as const;

type Range = typeof RANGES[number];

function cutoff(days: number): Date {
  if (days === 0) return new Date("2000-01-01");
  return startOfDay(subDays(new Date(), days));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClientReportsPage() {
  const [range, setRange] = useState<Range>(RANGES[2]);

  const { data: allOrders   = [] } = useMyOrders();
  const { data: allInvoices = [] } = useMyInvoices();

  const from = cutoff(range.days);

  // Filtered to range
  const orders   = useMemo(
    () => allOrders.filter(o => isAfter(new Date(o.created_at), from)),
    [allOrders, from]
  );
  const invoices = useMemo(
    () => allInvoices.filter(i => isAfter(new Date(i.created_at), from)),
    [allInvoices, from]
  );

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalSpent = useMemo(
    () => orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total_amount, 0),
    [orders]
  );

  const completedOrders = orders.filter(o => o.status !== "cancelled").length;
  const avgOrderValue   = completedOrders > 0 ? totalSpent / completedOrders : 0;

  const uniqueProducts = useMemo(() =>
    new Set(orders.flatMap(o => (o.order_items ?? []).map(i => i.product_id))).size,
    [orders]
  );

  const pendingInvoices = invoices.filter(
    i => i.status === "sent" || i.status === "overdue"
  ).length;

  // ── Period-over-period ─────────────────────────────────────────────────────
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

  const prevSpent = prevOrders
    .filter(o => o.status !== "cancelled")
    .reduce((s, o) => s + o.total_amount, 0);

  const spentChange = prevSpent === 0
    ? null
    : ((totalSpent - prevSpent) / prevSpent) * 100;

  const prevOrderCount = prevOrders.filter(o => o.status !== "cancelled").length;
  const orderChange    = prevOrderCount === 0
    ? null
    : ((completedOrders - prevOrderCount) / prevOrderCount) * 100;

  // ── 12-month spending trend ────────────────────────────────────────────────
  const monthlyChart = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const date   = subMonths(new Date(), 11 - i);
      const start  = startOfMonth(date);
      const end    = endOfMonth(date);
      const mo     = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end && o.status !== "cancelled";
      });
      return {
        month:   format(date, "MMM yy"),
        spent:   mo.reduce((s, o) => s + o.total_amount, 0),
        orders:  mo.length,
      };
    }),
    [allOrders]
  );

  const monthlyTable   = useMemo(() => [...monthlyChart].reverse(), [monthlyChart]);
  const yearTotal      = monthlyChart.reduce((s, m) => s + m.spent,  0);
  const yearOrderCount = monthlyChart.reduce((s, m) => s + m.orders, 0);

  // ── Invoice summary ────────────────────────────────────────────────────────
  const invoiceSummary = useMemo(() => {
    const paid      = invoices.filter(i => i.status === "paid");
    const sent      = invoices.filter(i => i.status === "sent");
    const overdue   = invoices.filter(i => i.status === "overdue");
    const draft     = invoices.filter(i => i.status === "draft");
    const cancelled = invoices.filter(i => i.status === "cancelled");

    return {
      paid:      { count: paid.length,      amount: paid.reduce((s, i)      => s + i.total_amount, 0) },
      sent:      { count: sent.length,      amount: sent.reduce((s, i)      => s + i.total_amount, 0) },
      overdue:   { count: overdue.length,   amount: overdue.reduce((s, i)   => s + i.total_amount, 0) },
      draft:     { count: draft.length,     amount: draft.reduce((s, i)     => s + i.total_amount, 0) },
      cancelled: { count: cancelled.length, amount: cancelled.reduce((s, i) => s + i.total_amount, 0) },
    };
  }, [invoices]);

  const totalInvoiced    = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalOutstanding = invoiceSummary.sent.amount + invoiceSummary.overdue.amount;

  // ── Category breakdown (from order items in filtered range) ───────────────
  const COLORS = [
    "hsl(145,45%,22%)", "hsl(42,85%,50%)", "hsl(152,60%,40%)",
    "hsl(210,80%,55%)", "hsl(340,65%,55%)", "hsl(270,60%,55%)",
  ];

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    orders
      .filter(o => o.status !== "cancelled")
      .forEach(o =>
        (o.order_items ?? []).forEach(item => {
          const cat = (item as typeof item & {
            products?: { categories?: { name: string } | null } | null
          }).products?.categories?.name ?? "Other";
          map[cat] = (map[cat] ?? 0) + item.total_price;
        })
      );
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  // ── Order status breakdown ─────────────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    pending:    "hsl(42,85%,50%)",
    processing: "hsl(210,80%,55%)",
    shipped:    "hsl(145,45%,22%)",
    delivered:  "hsl(152,60%,40%)",
    cancelled:  "hsl(0,72%,51%)",
  };

  const orderStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return Object.entries(map)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Client Portal">
      <div className="space-y-6">

        {/* Header + range filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">My Reports</h1>
            <p className="text-muted-foreground text-sm">Your spending and order analytics</p>
          </div>
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

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Spent"
            value={`₵ ${totalSpent.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change={
              spentChange === null
                ? "No prior period data"
                : `${spentChange >= 0 ? "+" : ""}${spentChange.toFixed(1)}% vs prev period`
            }
            changeType={spentChange === null ? "neutral" : spentChange >= 0 ? "negative" : "positive"}
            icon={DollarSign}
          />
          <StatCard
            title="Orders Placed"
            value={String(completedOrders)}
            change={
              orderChange === null
                ? "No prior period data"
                : `${orderChange >= 0 ? "+" : ""}${orderChange.toFixed(1)}% vs prev period`
            }
            changeType="neutral"
            icon={ShoppingCart}
          />
          <StatCard
            title="Avg Order Value"
            value={avgOrderValue > 0 ? `₵ ${avgOrderValue.toFixed(2)}` : "—"}
            change="Per completed order"
            changeType="neutral"
            icon={FileText}
          />
          <StatCard
            title="Products Ordered"
            value={String(uniqueProducts)}
            change={pendingInvoices > 0 ? `${pendingInvoices} invoice${pendingInvoices > 1 ? "s" : ""} pending` : "No pending invoices"}
            changeType={pendingInvoices > 0 ? "negative" : "positive"}
            icon={Package}
          />
        </div>

        {/* Period comparison */}
        {range.days > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${spentChange !== null && spentChange <= 0 ? "bg-success/10" : "bg-warning/10"}`}>
                {spentChange !== null && spentChange <= 0
                  ? <TrendingDown className="h-5 w-5 text-success" />
                  : <TrendingUp className="h-5 w-5 text-warning" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spending vs previous {range.label.toLowerCase()}</p>
                <p className="text-sm font-semibold mt-0.5">
                  This period: <span className="text-foreground">₵ {totalSpent.toFixed(2)}</span>
                  <span className="text-muted-foreground font-normal mx-1">·</span>
                  Prev: <span className="text-muted-foreground">₵ {prevSpent.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orders vs previous {range.label.toLowerCase()}</p>
                <p className="text-sm font-semibold mt-0.5">
                  This period: <span className="text-foreground">{completedOrders}</span>
                  <span className="text-muted-foreground font-normal mx-1">·</span>
                  Prev: <span className="text-muted-foreground">{prevOrderCount}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Spending trend area chart ────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Spending Trend — Last 12 Months</h3>
            <span className="text-xs text-muted-foreground">
              Total: ₵ {yearTotal.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyChart}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(42,85%,50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(42,85%,50%)" stopOpacity={0}   />
                </linearGradient>
              </defs>
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
                  name === "spent" ? `₵ ${v.toFixed(2)}` : v,
                  name === "spent" ? "Spent" : "Orders",
                ]}
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="hsl(42,85%,50%)"
                fill="url(#spendGrad)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(42,85%,50%)" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Monthly breakdown table ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">Monthly Breakdown</h3>
            <span className="text-xs text-muted-foreground">
              {yearOrderCount} orders · 12 months
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount Spent</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Avg per Order</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Share of Year</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTable.map(m => {
                  const avg   = m.orders > 0 ? m.spent / m.orders : 0;
                  const share = yearTotal > 0 ? (m.spent / yearTotal) * 100 : 0;
                  return (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{m.month}</td>
                      <td className="p-3 text-right text-muted-foreground">{m.orders || "—"}</td>
                      <td className="p-3 text-right font-semibold">
                        {m.spent > 0
                          ? `₵ ${m.spent.toFixed(2)}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {avg > 0 ? `₵ ${avg.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {share > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{share.toFixed(1)}%</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-semibold border-t border-border">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{yearOrderCount || "—"}</td>
                  <td className="p-3 text-right">₵ {yearTotal.toFixed(2)}</td>
                  <td className="p-3 text-right text-muted-foreground">
                    {yearOrderCount > 0 ? `₵ ${(yearTotal / yearOrderCount).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Invoice summary ──────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">Invoice Summary</h3>
            <span className="text-xs text-muted-foreground">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · {range.label}
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
              No invoices in this period
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
                {[
                  { label: "Total Invoiced", amount: totalInvoiced,                  color: "text-foreground",    bg: "" },
                  { label: "Paid",           amount: invoiceSummary.paid.amount,     color: "text-success",       bg: "bg-success/5" },
                  { label: "Outstanding",    amount: totalOutstanding,               color: "text-warning",       bg: "bg-warning/5" },
                  { label: "Overdue",        amount: invoiceSummary.overdue.amount,  color: "text-destructive",   bg: "bg-destructive/5" },
                ].map(s => (
                  <div key={s.label} className={`p-4 ${s.bg}`}>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${s.color}`}>
                      ₵ {s.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Status rows */}
              <div className="divide-y divide-border">
                {(
                  [
                    { key: "paid",      label: "Paid",      color: "bg-success/10 text-success"         },
                    { key: "sent",      label: "Sent",      color: "bg-info/10 text-info"               },
                    { key: "overdue",   label: "Overdue",   color: "bg-destructive/10 text-destructive" },
                    { key: "draft",     label: "Draft",     color: "bg-secondary text-secondary-foreground" },
                    { key: "cancelled", label: "Cancelled", color: "bg-muted text-muted-foreground"     },
                  ] as const
                ).map(row => {
                  const stat = invoiceSummary[row.key];
                  if (stat.count === 0) return null;
                  const pct = totalInvoiced > 0 ? (stat.amount / totalInvoiced) * 100 : 0;
                  return (
                    <div key={row.key} className="px-5 py-3 flex items-center gap-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${row.color}`}>
                        {row.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.key === "paid"      ? "bg-success"     :
                            row.key === "sent"      ? "bg-info"        :
                            row.key === "overdue"   ? "bg-destructive" :
                            "bg-muted-foreground"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-right shrink-0 min-w-[120px]">
                        <span className="text-sm font-semibold">₵ {stat.amount.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {stat.count} inv. · {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overdue alert */}
              {invoiceSummary.overdue.count > 0 && (
                <div className="mx-5 mb-5 mt-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive font-medium">
                  You have {invoiceSummary.overdue.count} overdue invoice{invoiceSummary.overdue.count > 1 ? "s" : ""} totalling ₵ {invoiceSummary.overdue.amount.toFixed(2)} — please contact us to arrange payment.
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Category breakdown + order status ───────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Category breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Spending by Category</h3>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No order data in this period
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, _: string, props: { payload?: { name?: string; pct?: number } }) => [
                        `₵ ${v.toFixed(2)} (${(props.payload?.pct ?? 0).toFixed(1)}%)`,
                        props.payload?.name ?? "",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 mt-2">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{c.pct.toFixed(1)}%</span>
                          <span className="font-medium w-24 text-right">₵ {c.value.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${c.pct}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Order status breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Orders by Status</h3>
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
                          fill={STATUS_COLORS[entry.status] ?? "hsl(220,14%,70%)"}
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
                <div className="space-y-2 mt-2">
                  {orderStatusData.map(entry => {
                    const pct = orders.length > 0
                      ? ((entry.count / orders.length) * 100).toFixed(1)
                      : "0";
                    return (
                      <div key={entry.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "hsl(220,14%,70%)" }}
                          />
                          <span className="capitalize text-muted-foreground">{entry.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{pct}%</span>
                          <span className="font-medium w-6 text-right">{entry.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
