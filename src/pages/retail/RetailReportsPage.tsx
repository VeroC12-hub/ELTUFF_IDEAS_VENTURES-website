import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAllInvoices, Invoice } from "@/hooks/useInvoices";
import retailNavGroups from "@/lib/retailNavGroups";

type Range = "day" | "month" | "year";

const inRange = (iso: string, range: Range) => {
  const d = new Date(iso);
  const now = new Date();
  if (range === "day") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return d.getFullYear() === now.getFullYear();
};

interface StaffTotals {
  name: string;
  total: number;
  count: number;
}

function summarize(invoices: Invoice[], range: Range) {
  const receipts = invoices.filter(
    i => (i as any).channel === "retail" && i.status === "paid" && inRange(i.created_at, range)
  );
  const byStaff = new Map<string, StaffTotals>();
  for (const inv of receipts) {
    const key = (inv as any).sold_by ?? "unknown";
    const name = (inv as any).sold_by_name ?? "Unassigned";
    const cur = byStaff.get(key) ?? { name, total: 0, count: 0 };
    cur.total += inv.total_amount;
    cur.count += 1;
    byStaff.set(key, cur);
  }
  const grandTotal = receipts.reduce((s, i) => s + i.total_amount, 0);
  return {
    grandTotal,
    count: receipts.length,
    byStaff: [...byStaff.values()].sort((a, b) => b.total - a.total),
  };
}

function RangeSection({ title, data }: { title: string; data: ReturnType<typeof summarize> }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <div className="text-right">
          <p className="text-lg font-bold">₵ {data.grandTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{data.count} transactions</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Staff</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Transactions</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.byStaff.length === 0 ? (
            <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No sales in this period</td></tr>
          ) : data.byStaff.map(s => (
            <tr key={s.name} className="border-b border-border/50">
              <td className="p-3">{s.name}</td>
              <td className="p-3 text-muted-foreground">{s.count}</td>
              <td className="p-3 text-right font-medium">₵ {s.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RetailReportsPage() {
  const { data: invoices = [] } = useAllInvoices();

  const day = useMemo(() => summarize(invoices, "day"), [invoices]);
  const month = useMemo(() => summarize(invoices, "month"), [invoices]);
  const year = useMemo(() => summarize(invoices, "year"), [invoices]);

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Sales by staff, plus totals for day, month and year</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Today</p>
            <p className="text-2xl font-bold">₵ {day.grandTotal.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total This Month</p>
            <p className="text-2xl font-bold">₵ {month.grandTotal.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total This Year</p>
            <p className="text-2xl font-bold">₵ {year.grandTotal.toFixed(2)}</p>
          </div>
        </div>

        <RangeSection title="Today by Staff" data={day} />
        <RangeSection title="This Month by Staff" data={month} />
        <RangeSection title="This Year by Staff" data={year} />
      </div>
    </DashboardLayout>
  );
}
