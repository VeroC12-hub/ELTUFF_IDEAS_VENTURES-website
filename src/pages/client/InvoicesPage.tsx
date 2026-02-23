import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyInvoices, Invoice } from "@/hooks/useInvoices";
import { LayoutDashboard, ShoppingBag, Receipt, BarChart3, Settings } from "lucide-react";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard }] },
  { label: "Orders", items: [{ title: "My Orders", url: "/client/orders", icon: ShoppingBag }, { title: "Invoices", url: "/client/invoices", icon: Receipt }] },
  { label: "Analytics", items: [{ title: "Reports", url: "/client/reports", icon: BarChart3 }, { title: "Settings", url: "/client/settings", icon: Settings }] },
];

const statusColor: Record<string, string> = {
  draft:     "bg-secondary text-secondary-foreground",
  sent:      "bg-info/10 text-info",
  paid:      "bg-success/10 text-success",
  overdue:   "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function ClientInvoicesPage() {
  const { data: invoices = [], isLoading } = useMyInvoices();
  const [selected, setSelected] = useState<Invoice | null>(null);

  const unpaid = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const totalOwed = unpaid.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices
    .filter(i => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Client Portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">My Invoices</h1>
          <p className="text-muted-foreground text-sm">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold mt-0.5">{invoices.length}</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold mt-0.5 text-warning">₵ {totalOwed.toFixed(2)}</p>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold mt-0.5 text-success">₵ {totalPaid.toFixed(2)}</p>
          </div>
        </div>

        {/* Overdue alert */}
        {invoices.some(i => i.status === "overdue") && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
            You have {invoices.filter(i => i.status === "overdue").length} overdue invoice{invoices.filter(i => i.status === "overdue").length > 1 ? "s" : ""} — please contact us to arrange payment.
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Issued</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No invoices yet
                    </td>
                  </tr>
                ) : invoices.map(inv => {
                  const isOverdue = inv.due_date &&
                    new Date(inv.due_date) < new Date() &&
                    inv.status !== "paid" &&
                    inv.status !== "cancelled";
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelected(inv)}
                    >
                      <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {format(new Date(inv.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-xs">
                        {inv.due_date ? (
                          <span className={isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {format(new Date(inv.due_date), "MMM d, yyyy")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        ₵ {inv.total_amount.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-xs text-primary font-medium">View</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              {/* Status + dates */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor[selected.status]}`}>
                  {selected.status}
                </span>
                <div className="text-xs text-muted-foreground text-right">
                  <p>Issued {format(new Date(selected.created_at), "MMM d, yyyy")}</p>
                  {selected.due_date && (
                    <p>Due {format(new Date(selected.due_date), "MMM d, yyyy")}</p>
                  )}
                </div>
              </div>

              {/* Paid confirmation */}
              {selected.status === "paid" && selected.paid_date && (
                <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2 text-xs text-success font-medium">
                  Paid on {format(new Date(selected.paid_date), "MMMM d, yyyy")}
                </div>
              )}

              {/* Overdue warning */}
              {selected.status === "overdue" && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive font-medium">
                  This invoice is overdue. Please contact us to arrange payment.
                </div>
              )}

              {/* Line items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  ITEMS
                </div>
                {(selected.invoice_items ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">No line items</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(selected.invoice_items ?? []).map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × ₵ {item.unit_price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">₵ {item.total_price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-border divide-y divide-border/50">
                  <div className="flex justify-between px-3 py-2 text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₵ {selected.amount.toFixed(2)}</span>
                  </div>
                  {selected.tax_amount > 0 && (
                    <div className="flex justify-between px-3 py-2 text-sm text-muted-foreground">
                      <span>Tax</span>
                      <span>₵ {selected.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2.5 text-sm font-bold bg-muted/30">
                    <span>Total</span>
                    <span>₵ {selected.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selected.notes && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">NOTES</p>
                  <p className="text-muted-foreground">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
