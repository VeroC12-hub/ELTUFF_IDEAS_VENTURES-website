import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAllOrders } from "@/hooks/useOrders";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3, Settings,
  DollarSign, ShoppingCart, UserPlus, Warehouse, CreditCard,
  ClipboardList, TrendingUp, TrendingDown, Calendar,
  FlaskConical, BookOpen, Calculator, FileDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, Line,
} from "recharts";
import {
  subDays, startOfDay, endOfDay, isWithinInterval,
  format, startOfMonth, endOfMonth, subMonths,
} from "date-fns";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/exportUtils";

const navGroups = [
  { label: "Overview",    items: [{ title: "Dashboard",  url: "/staff/dashboard",                   icon: LayoutDashboard }] },
  { label: "Sales",       items: [{ title: "Quotes",     url: "/staff/quotes",                      icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management",  items: [{ title: "Clients",    url: "/staff/clients",                     icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",        icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",     items: [{ title: "Accounts",   url: "/staff/accounts",                    icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",      items: [{ title: "Team",       url: "/staff/team",                        icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const COLORS = ["hsl(145,45%,22%)", "hsl(42,85%,50%)", "hsl(152,60%,40%)", "hsl(210,80%,55%)", "hsl(340,65%,55%)"];

type Preset = "7d" | "30d" | "90d" | "12m" | "custom";

function getWindow(preset: Preset, from: string, to: string): { start: Date; end: Date } {
  const now = new Date();
  if (preset === "7d")  return { start: startOfDay(subDays(now, 6)),   end: endOfDay(now) };
  if (preset === "30d") return { start: startOfDay(subDays(now, 29)),  end: endOfDay(now) };
  if (preset === "90d") return { start: startOfDay(subDays(now, 89)),  end: endOfDay(now) };
  if (preset === "12m") return { start: startOfDay(subDays(now, 364)), end: endOfDay(now) };
  // custom
  const s = from ? startOfDay(new Date(from)) : startOfDay(subDays(now, 29));
  const e = to   ? endOfDay(new Date(to))     : endOfDay(now);
  return { start: s, end: e };
}

function getPrevWindow(start: Date, end: Date): { start: Date; end: Date } {
  const len = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - len - 1), end: new Date(start.getTime() - 1) };
}

export default function ReportsPage() {
  const { data: orders   = [] } = useAllOrders();
  const { data: invoices = [] } = useAllInvoices();
  const { data: clients  = [] } = useClients();

  const [preset,    setPreset]    = useState<Preset>("30d");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");

  const { start, end } = useMemo(() => getWindow(preset, fromDate, toDate), [preset, fromDate, toDate]);
  const { start: prevStart, end: prevEnd } = useMemo(() => getPrevWindow(start, end), [start, end]);

  const inWindow     = (d: string) => isWithinInterval(new Date(d), { start, end });
  const inPrevWindow = (d: string) => isWithinInterval(new Date(d), { start: prevStart, end: prevEnd });

  // ── Current window data ────────────────────────────────────────────────────
  const curOrders   = useMemo(() => orders.filter(o => inWindow(o.created_at) && o.status !== "cancelled"),   [orders, start, end]);
  const curInvoices = useMemo(() => invoices.filter(i => inWindow(i.created_at)),                             [invoices, start, end]);
  const newClients  = useMemo(() => clients.filter(c => inWindow(c.created_at ?? "")),                        [clients, start, end]);

  const curRevenue     = curOrders.reduce((s, o)   => s + o.total_amount, 0);
  const curTax         = curInvoices.reduce((s, i) => s + (i.tax_amount ?? 0), 0);
  const curOutstanding = invoices.filter(i => inWindow(i.created_at) && (i.status === "sent" || i.status === "overdue"))
                                 .reduce((s, i) => s + i.total_amount, 0);

  // ── Previous window data (for comparison) ─────────────────────────────────
  const prevOrders  = useMemo(() => orders.filter(o => inPrevWindow(o.created_at) && o.status !== "cancelled"), [orders, prevStart, prevEnd]);
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total_amount, 0);
  const prevClients = useMemo(() => clients.filter(c => inPrevWindow(c.created_at ?? "")), [clients, prevStart, prevEnd]);

  const revDelta      = prevRevenue > 0 ? ((curRevenue - prevRevenue)   / prevRevenue)   * 100 : null;
  const ordersDelta   = prevOrders.length > 0 ? ((curOrders.length - prevOrders.length) / prevOrders.length) * 100 : null;
  const clientsDelta  = prevClients.length > 0 ? ((newClients.length - prevClients.length) / prevClients.length) * 100 : null;

  const Delta = ({ val }: { val: number | null }) => {
    if (val === null) return <span className="text-xs text-muted-foreground">—</span>;
    const pos = val >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? "text-success" : "text-destructive"}`}>
        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(val).toFixed(1)}% vs prev period
      </span>
    );
  };

  const statCards = [
    {
      icon: DollarSign,
      label: "Revenue",
      value: `₵ ${curRevenue.toFixed(2)}`,
      delta: revDelta,
      bg: "bg-success/5 border-success/20",
      iconColor: "text-success",
    },
    {
      icon: ShoppingCart,
      label: "Orders",
      value: String(curOrders.length),
      delta: ordersDelta,
      bg: "bg-primary/5 border-primary/20",
      iconColor: "text-primary",
    },
    {
      icon: Receipt,
      label: "Outstanding",
      value: `₵ ${curOutstanding.toFixed(2)}`,
      delta: null,
      bg: "bg-warning/5 border-warning/20",
      iconColor: "text-warning",
    },
    {
      icon: Users,
      label: "New Clients",
      value: String(newClients.length),
      delta: clientsDelta,
      bg: "bg-info/5 border-info/20",
      iconColor: "text-info",
    },
  ];

  // ── Top clients (by revenue in window) ───────────────────────────────────
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; email: string; company: string; revenue: number; orders: number }> = {};
    curOrders.forEach(o => {
      const profile = clients.find(c => c.user_id === o.user_id);
      const key     = o.user_id;
      if (!map[key]) map[key] = { name: profile?.full_name || "Unknown", email: profile?.email || "", company: profile?.company_name || "", revenue: 0, orders: 0 };
      map[key].revenue += o.total_amount;
      map[key].orders  += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [curOrders, clients]);

  // ── Top products (by revenue in window) ───────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; qty: number }> = {};
    curOrders.forEach(o => {
      (o.order_items ?? []).forEach((item: { products?: { name?: string } | null; total_price: number; quantity: number }) => {
        const name = item.products?.name ?? "Unknown";
        if (!map[name]) map[name] = { name, revenue: 0, qty: 0 };
        map[name].revenue += item.total_price;
        map[name].qty     += item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [curOrders]);

  // ── Export helpers ─────────────────────────────────────────────────────────
  const totalRevenue = curOrders.reduce((s, o) => s + o.total_amount, 0);

  // ── 12-month revenue + orders chart (always last 12 months) ──────────────
  const revenueChart = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const date  = subMonths(new Date(), 11 - i);
      const s     = startOfMonth(date);
      const e     = endOfMonth(date);
      const inM   = (d: string) => isWithinInterval(new Date(d), { start: s, end: e });
      const rev   = orders.filter(o => inM(o.created_at) && o.status !== "cancelled")
                          .reduce((sum, o) => sum + o.total_amount, 0);
      const cnt   = orders.filter(o => inM(o.created_at) && o.status !== "cancelled").length;
      return { month: format(date, "MMM"), revenue: rev, orders: cnt };
    }),
  [orders]);

  // ── Monthly breakdown for selected window ─────────────────────────────────
  const monthlyBreakdown = useMemo(() => {
    // Collect all distinct year-months in window
    const monthSet = new Set<string>();
    orders.forEach(o => {
      if (isWithinInterval(new Date(o.created_at), { start, end })) {
        monthSet.add(format(new Date(o.created_at), "yyyy-MM"));
      }
    });
    invoices.forEach(i => {
      if (isWithinInterval(new Date(i.created_at), { start, end })) {
        monthSet.add(format(new Date(i.created_at), "yyyy-MM"));
      }
    });

    return Array.from(monthSet).sort().map(ym => {
      const [y, m] = ym.split("-").map(Number);
      const mStart = startOfMonth(new Date(y, m - 1));
      const mEnd   = endOfMonth(new Date(y, m - 1));
      const inM    = (d: string) => isWithinInterval(new Date(d), { start: mStart, end: mEnd });

      const mOrders    = orders.filter(o => inM(o.created_at) && o.status !== "cancelled");
      const cancelled  = orders.filter(o => inM(o.created_at) && o.status === "cancelled").length;
      const revenue    = mOrders.reduce((s, o) => s + o.total_amount, 0);
      const avgOrder   = mOrders.length > 0 ? revenue / mOrders.length : 0;
      const taxCol     = invoices.filter(i => inM(i.created_at)).reduce((s, i) => s + (i.tax_amount ?? 0), 0);
      const netRevenue = revenue - taxCol;

      return {
        label:     format(new Date(y, m - 1), "MMM yyyy"),
        orders:    mOrders.length,
        cancelled,
        revenue,
        avgOrder,
        taxCol,
        netRevenue,
      };
    }).reverse(); // newest first
  }, [orders, invoices, start, end]);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header + export toolbar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Business performance analytics</p>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Export:</span>
            {/* CSV — monthly breakdown */}
            <button
              onClick={() => exportCSV(
                `eltuff-report-${format(start,"yyyy-MM-dd")}`,
                ["Month","Orders","Cancelled","Revenue","Avg Order","Tax Collected","Net Revenue"],
                monthlyBreakdown.map(r => [r.label, r.orders, r.cancelled, r.revenue.toFixed(2), r.avgOrder.toFixed(2), r.taxCol.toFixed(2), r.netRevenue.toFixed(2)])
              )}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" /> CSV
            </button>
            {/* Excel — 4 sheets */}
            <button
              onClick={() => exportXLSX(
                `eltuff-report-${format(start,"yyyy-MM-dd")}`,
                [
                  {
                    name: "Summary",
                    headers: ["Metric","Value"],
                    rows: [
                      ["Period", `${format(start,"MMM d, yyyy")} – ${format(end,"MMM d, yyyy")}`],
                      ["Total Revenue (₵)", totalRevenue.toFixed(2)],
                      ["Total Orders", curOrders.length],
                      ["Tax Collected (₵)", curTax.toFixed(2)],
                      ["Outstanding (₵)", curOutstanding.toFixed(2)],
                      ["New Clients", newClients.length],
                    ],
                  },
                  {
                    name: "Monthly Breakdown",
                    headers: ["Month","Orders","Cancelled","Revenue","Avg Order","Tax Collected","Net Revenue"],
                    rows: monthlyBreakdown.map(r => [r.label, r.orders, r.cancelled, r.revenue.toFixed(2), r.avgOrder.toFixed(2), r.taxCol.toFixed(2), r.netRevenue.toFixed(2)]),
                  },
                  {
                    name: "Top Clients",
                    headers: ["Client","Company","Orders","Revenue (₵)"],
                    rows: topClients.map(c => [c.name, c.company, c.orders, c.revenue.toFixed(2)]),
                  },
                  {
                    name: "Top Products",
                    headers: ["Product","Qty Sold","Revenue (₵)"],
                    rows: topProducts.map(p => [p.name, p.qty, p.revenue.toFixed(2)]),
                  },
                ]
              )}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" /> Excel
            </button>
            {/* PDF */}
            <button
              onClick={() => exportPDF(
                `eltuff-report-${format(start,"yyyy-MM-dd")}`,
                `Eltuff Ideas Ventures — Sales Report\n${format(start,"MMM d, yyyy")} to ${format(end,"MMM d, yyyy")}`,
                [
                  {
                    heading: "Monthly Breakdown",
                    columns: ["Month","Orders","Cancelled","Revenue (₵)","Avg Order (₵)","Tax (₵)","Net Revenue (₵)"],
                    rows: monthlyBreakdown.map(r => [r.label, r.orders, r.cancelled, r.revenue.toFixed(2), r.avgOrder.toFixed(2), r.taxCol.toFixed(2), r.netRevenue.toFixed(2)]),
                  },
                  {
                    heading: "Top Clients",
                    columns: ["Client","Company","Orders","Revenue (₵)"],
                    rows: topClients.map(c => [c.name, c.company, c.orders, c.revenue.toFixed(2)]),
                  },
                  {
                    heading: "Top Products",
                    columns: ["Product","Qty Sold","Revenue (₵)"],
                    rows: topProducts.map(p => [p.name, p.qty, p.revenue.toFixed(2)]),
                  },
                ]
              )}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Date range selector */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {(["7d","30d","90d","12m","custom"] as Preset[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    preset === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : p === "90d" ? "Last 90 days" : p === "12m" ? "Last 12 months" : "Custom"}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
            <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
              {format(start, "MMM d, yyyy")} — {format(end, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label} className={`border rounded-xl p-4 ${card.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="mt-1">
                <Delta val={card.delta} />
              </div>
            </div>
          ))}
        </div>

        {/* Tax collected callout */}
        {curTax > 0 && (
          <div className="bg-muted/40 border border-border rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Tax Collected (period)</span>
            <span className="font-bold text-sm">₵ {curTax.toFixed(2)}</span>
          </div>
        )}

        {/* ── Revenue & orders chart (12 months) ──────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold mb-4">Revenue & Orders — Last 12 Months</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={revenueChart} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis yAxisId="rev" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="ord" orientation="right" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: number, name: string) =>
                  name === "revenue" ? [`₵ ${val.toFixed(2)}`, "Revenue"] : [val, "Orders"]
                }
              />
              <Legend formatter={v => v === "revenue" ? "Revenue (₵)" : "Orders"} />
              <Bar yAxisId="rev" dataKey="revenue" fill="hsl(145,45%,22%)" radius={[4,4,0,0]} name="revenue" />
              <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="hsl(42,85%,50%)"
                strokeWidth={2} dot={{ r: 3 }} name="orders" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Monthly breakdown table ───────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-display font-semibold">Monthly Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(start, "MMM d, yyyy")} — {format(end, "MMM d, yyyy")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" id="monthly-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Cancelled</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Revenue (₵)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Avg Order (₵)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Tax Collected (₵)</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Net Revenue (₵)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No data for selected period</td></tr>
                ) : monthlyBreakdown.map(row => (
                  <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{row.label}</td>
                    <td className="p-3 text-right">{row.orders}</td>
                    <td className="p-3 text-right text-destructive">{row.cancelled || "—"}</td>
                    <td className="p-3 text-right font-semibold">{row.revenue.toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">{row.avgOrder.toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">{row.taxCol > 0 ? row.taxCol.toFixed(2) : "—"}</td>
                    <td className="p-3 text-right font-semibold text-success">{row.netRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              {monthlyBreakdown.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td className="p-3">Totals</td>
                    <td className="p-3 text-right">{monthlyBreakdown.reduce((s, r) => s + r.orders, 0)}</td>
                    <td className="p-3 text-right text-destructive">{monthlyBreakdown.reduce((s, r) => s + r.cancelled, 0) || "—"}</td>
                    <td className="p-3 text-right">{monthlyBreakdown.reduce((s, r) => s + r.revenue, 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">—</td>
                    <td className="p-3 text-right">{monthlyBreakdown.reduce((s, r) => s + r.taxCol, 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-success">{monthlyBreakdown.reduce((s, r) => s + r.netRevenue, 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Invoice aging + status pies ──────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Invoice aging */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold">Invoice Aging</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Outstanding invoices by days overdue</p>
            </div>
            <div className="p-5 space-y-3">
              {(() => {
                const open = invoices.filter(i => i.status === "sent" || i.status === "overdue");
                const buckets = [
                  { label: "0–30 days",  color: "bg-success",     items: open.filter(i => { const d = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000); return d <= 30; }) },
                  { label: "31–60 days", color: "bg-warning",     items: open.filter(i => { const d = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000); return d > 30 && d <= 60; }) },
                  { label: "61–90 days", color: "bg-orange-500",  items: open.filter(i => { const d = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000); return d > 60 && d <= 90; }) },
                  { label: "90+ days",   color: "bg-destructive", items: open.filter(i => { const d = Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000); return d > 90; }) },
                ];
                const totalAmt = open.reduce((s, i) => s + i.total_amount, 0) || 1;
                return buckets.map(b => {
                  const amt = b.items.reduce((s, i) => s + i.total_amount, 0);
                  const pct = (amt / totalAmt) * 100;
                  return (
                    <div key={b.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{b.label} <span className="font-medium text-foreground">({b.items.length})</span></span>
                        <span className="font-semibold">₵ {amt.toFixed(2)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="pt-2 border-t border-border flex justify-between text-sm font-bold">
                <span>Total Outstanding</span>
                <span>₵ {invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total_amount, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Invoice status pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">Invoice Status</h3>
            {(() => {
              const statuses = ["draft","sent","paid","overdue","cancelled"];
              const statusLabels: Record<string,string> = { draft:"Draft", sent:"Sent", paid:"Paid", overdue:"Overdue", cancelled:"Cancelled" };
              const data = statuses
                .map(s => ({ name: statusLabels[s], value: curInvoices.filter(i => i.status === s).length }))
                .filter(d => d.value > 0);
              if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">No invoices in period</p>;
              return (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {data.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold mb-4">Order Status Breakdown</h3>
          {(() => {
            const statuses = ["pending","processing","shipped","delivered","cancelled"];
            const data = statuses.map(s => ({
              name: s.charAt(0).toUpperCase() + s.slice(1),
              count: curOrders.filter(o => o.status === s).length,
              revenue: curOrders.filter(o => o.status === s).reduce((sum, o) => sum + o.total_amount, 0),
            })).filter(d => d.count > 0);
            const total = data.reduce((s, d) => s + d.count, 0) || 1;
            if (!data.length) return <p className="text-sm text-muted-foreground">No orders in period</p>;
            return (
              <div className="grid sm:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.map(d => ({ name: d.name, value: d.count }))}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.map((d, i) => (
                    <div key={d.name} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-medium">{d.count} orders · ₵ {d.revenue.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.count / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Top clients + top products ───────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Top clients */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold">Top Clients</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By revenue in selected period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No data</td></tr>
                  ) : topClients.map((c, i) => {
                    const share = totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.company || c.email}</p>
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{c.orders}</td>
                        <td className="p-3 text-right font-semibold">₵ {c.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top products */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold">Top Products</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By revenue in selected period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Qty Sold</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No data</td></tr>
                  ) : topProducts.map((p, i) => {
                    const share = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right text-muted-foreground">{p.qty}</td>
                        <td className="p-3 text-right font-semibold">₵ {p.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{share.toFixed(0)}%</span>
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

      </div>
    </DashboardLayout>
  );
}
