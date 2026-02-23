import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyOrders, Order } from "@/hooks/useOrders";
import { LayoutDashboard, ShoppingBag, Receipt, BarChart3, Settings, Package } from "lucide-react";
import { format } from "date-fns";

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard }] },
  { label: "Orders", items: [{ title: "My Orders", url: "/client/orders", icon: ShoppingBag }, { title: "Invoices", url: "/client/invoices", icon: Receipt }] },
  { label: "Analytics", items: [{ title: "Reports", url: "/client/reports", icon: BarChart3 }, { title: "Settings", url: "/client/settings", icon: Settings }] },
];

const statusColor: Record<string, string> = {
  pending:    "bg-warning/10 text-warning",
  processing: "bg-info/10 text-info",
  shipped:    "bg-primary/10 text-primary",
  delivered:  "bg-success/10 text-success",
  cancelled:  "bg-destructive/10 text-destructive",
};

const statusSteps = ["pending", "processing", "shipped", "delivered"];

export default function ClientOrdersPage() {
  const { data: orders = [], isLoading } = useMyOrders();
  const [selected, setSelected] = useState<Order | null>(null);

  const activeOrders  = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const pastOrders    = orders.filter(o => o.status === "delivered" || o.status === "cancelled");

  const OrderRow = ({ order }: { order: Order }) => (
    <tr
      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => setSelected(order)}
    >
      <td className="p-3 font-mono text-xs">{order.order_number}</td>
      <td className="p-3 text-muted-foreground text-xs">
        {format(new Date(order.created_at), "MMM d, yyyy")}
      </td>
      <td className="p-3 text-muted-foreground">
        {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}
      </td>
      <td className="p-3 font-semibold text-right">₵ {order.total_amount.toFixed(2)}</td>
      <td className="p-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[order.status]}`}>
          {order.status}
        </span>
      </td>
    </tr>
  );

  const OrderTable = ({ rows, emptyMsg }: { rows: Order[]; emptyMsg: string }) => (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Order #</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Items</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{emptyMsg}</td></tr>
            ) : rows.map(o => <OrderRow key={o.id} order={o} />)}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <DashboardLayout navGroups={navGroups} portalName="Client Portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm">{orders.length} total order{orders.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "Active", value: activeOrders.length },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-secondary/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Active Orders</h2>
                <OrderTable rows={activeOrders} emptyMsg="" />
              </div>
            )}
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Order History</h2>
              <OrderTable rows={pastOrders} emptyMsg="No past orders yet." />
            </div>
          </>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.order_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              {/* Status tracker */}
              {selected.status !== "cancelled" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">ORDER STATUS</p>
                  <div className="flex items-center gap-1">
                    {statusSteps.map((step, i) => {
                      const currentIdx = statusSteps.indexOf(selected.status);
                      const done = i <= currentIdx;
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className={`flex flex-col items-center flex-1 ${i !== 0 ? "ml-1" : ""}`}>
                            <div className={`h-2 w-full rounded-full ${done ? "bg-success" : "bg-secondary"}`} />
                            <p className={`text-[9px] mt-1 capitalize ${done ? "text-success font-semibold" : "text-muted-foreground"}`}>
                              {step}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected.status === "cancelled" && (
                <p className="text-xs font-semibold text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  This order was cancelled
                </p>
              )}

              {/* Items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  ITEMS
                </div>
                <div className="divide-y divide-border">
                  {(selected.order_items ?? []).map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{item.products?.name ?? "Product"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} {item.products?.unit} × ₵ {item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">₵ {item.total_price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between px-3 py-2.5 bg-muted/30 text-sm font-bold border-t border-border">
                  <span>Total</span>
                  <span>₵ {selected.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Placed {format(new Date(selected.created_at), "MMMM d, yyyy 'at' HH:mm")}</p>
                {selected.shipping_address && <p>Ship to: {selected.shipping_address}</p>}
                {selected.notes && <p>Note: {selected.notes}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
