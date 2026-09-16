import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAllInvoices, useUpdateInvoiceStatus, Invoice } from "@/hooks/useInvoices";
import { useAllProducts } from "@/hooks/useProducts";
import { useAdjustStock } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import retailNavGroups from "@/lib/retailNavGroups";
import { printReceipt } from "@/lib/printReceipt";
import { Receipt, RotateCcw, Printer } from "lucide-react";

export default function RetailReceiptsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: invoices = [], isLoading } = useAllInvoices();
  const { data: products = [] } = useAllProducts();
  const updateStatus = useUpdateInvoiceStatus();
  const adjustStock = useAdjustStock();
  const [refundingBusy, setRefundingBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [refunding, setRefunding] = useState<Invoice | null>(null);

  const retailReceipts = useMemo(
    () => invoices
      .filter(i => (i as any).channel === "retail")
      .filter(i =>
        (i.invoice_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
        ((i as any).billing_name ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [invoices, search]
  );

  const handleRefund = async () => {
    if (!refunding) return;
    setRefundingBusy(true);
    try {
      await updateStatus.mutateAsync({ id: refunding.id, status: "cancelled" });

      for (const item of refunding.invoice_items ?? []) {
        const productId = (item as any).product_id as string | null;
        if (!productId) continue;
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        await adjustStock.mutateAsync({
          productId,
          changeAmount: item.quantity,
          currentStock: product.stock_quantity,
          reason: `Refund — ${refunding.invoice_number}`,
          operatedBy: user?.id ?? "",
        });
      }

      toast({ title: "Receipt refunded and stock restored" });
      setRefunding(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setRefundingBusy(false);
    }
  };

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Receipts</h1>
          <p className="text-muted-foreground text-sm">{retailReceipts.length} retail sales</p>
        </div>

        <Input placeholder="Search by receipt # or customer…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Receipt #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : retailReceipts.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No retail sales yet</td></tr>
                ) : retailReceipts.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{inv.invoice_number}</td>
                    <td className="p-3 text-muted-foreground">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="p-3">{(inv as any).billing_name ?? "Walk-in Customer"}</td>
                    <td className="p-3 capitalize text-muted-foreground">{(inv as any).payment_method ?? "—"}</td>
                    <td className="p-3 font-semibold">₵ {inv.total_amount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        inv.status === "paid" ? "bg-success/15 text-success" :
                        inv.status === "cancelled" ? "bg-destructive/15 text-destructive" :
                        "bg-secondary text-secondary-foreground"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(inv)}><Receipt className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => printReceipt({
                            invoice_number: inv.invoice_number,
                            created_at: inv.created_at,
                            total_amount: inv.total_amount,
                            billing_name: (inv as any).billing_name,
                            payment_method: (inv as any).payment_method,
                            invoice_items: inv.invoice_items,
                          })}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {inv.status === "paid" && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setRefunding(inv)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View receipt */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receipt {viewing?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{viewing && new Date(viewing.created_at).toLocaleString()}</p>
            <p><span className="text-muted-foreground">Customer:</span> {(viewing as any)?.billing_name ?? "Walk-in Customer"}</p>
            <div className="border-t border-border pt-2 space-y-1">
              {viewing?.invoice_items?.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.quantity} × {item.description}</span>
                  <span>₵ {item.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>₵ {viewing?.total_amount.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund confirm */}
      <Dialog open={!!refunding} onOpenChange={o => !o && setRefunding(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refund Receipt?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark <strong>{refunding?.invoice_number}</strong> (₵ {refunding?.total_amount.toFixed(2)}) as refunded/cancelled?
            Its items will be added back to stock automatically.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefunding(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRefund} disabled={refundingBusy}>
              {refundingBusy ? "Processing…" : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
