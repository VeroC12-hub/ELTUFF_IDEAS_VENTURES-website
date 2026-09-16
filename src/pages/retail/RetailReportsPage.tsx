import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAllInvoices } from "@/hooks/useInvoices";
import retailNavGroups from "@/lib/retailNavGroups";

type Range = "today" | "week" | "month";

const inRange = (iso: string, range: Range) => {
  const d = new Date(iso);
  const now = new Date();
  if (range === "today") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  const days = range === "week" ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d >= cutoff;
};

export default function RetailReportsPage() {
  const { data: invoices = [] } = useAllInvoices();
  const [range, setRange] = useState<Range>("today");

  const receipts = useMemo(
    () => invoices.filter(i => (i as any).channel === "retail" && i.status === "paid" && inRange(i.created_at, range)),
    [invoices, range]
  );

  const total = receipts.reduce((s, i) => s + i.total_amount, 0);

  const byPayment = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of receipts) {
      const method = (r as any).payment_method ?? "unknown";
      map.set(method, (map.get(method) ?? 0) + r.total_amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [receipts]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const r of receipts) {
      for (const item of r.invoice_items ?? []) {
        const cur = map.get(item.description) ?? { qty: 0, revenue: 0 };
        cur.qty += item.quantity;
        cur.revenue += item.total_price;
        map.set(item.description, cur);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
  }, [receipts]);

  const ranges: { value: Range; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
  ];

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Retail sales summary</p>
        </div>

        <div className="flex gap-2">
          {ranges.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                range === r.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
            <p className="text-2xl font-bold">₵ {total.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{receipts.length} transactions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold mb-2">By Payment Method</p>
            {byPayment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period</p>
            ) : (
              <div className="space-y-1">
                {byPayment.map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{method}</span>
                    <span className="font-medium">₵ {amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-semibold">Top Products</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Qty Sold</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No sales in this period</td></tr>
              ) : topProducts.map(([name, stats]) => (
                <tr key={name} className="border-b border-border/50">
                  <td className="p-3">{name}</td>
                  <td className="p-3 text-muted-foreground">{stats.qty}</td>
                  <td className="p-3 text-right font-medium">₵ {stats.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
