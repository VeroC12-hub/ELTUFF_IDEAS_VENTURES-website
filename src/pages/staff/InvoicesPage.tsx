import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllInvoices, useUpdateInvoiceStatus, useCreateInvoice, Invoice } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useAllProducts } from "@/hooks/useProducts";
import { usePartialPayments, useAddPartialPayment, useDeletePartialPayment, PAYMENT_METHOD_LABELS, PaymentMethod } from "@/hooks/usePartialPayments";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { LayoutDashboard, Package, PackageOpen, Warehouse, Users, Receipt, ShoppingCart, ClipboardList, BarChart3, Settings, UserPlus, CreditCard, Plus, Building2, Mail, Trash2, Printer, FlaskConical, BookOpen, Calculator, DollarSign, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { printInvoice } from "@/lib/printInvoice";
import { loadCompany } from "@/pages/staff/SettingsPage";

/** Convert a local phone number to WhatsApp-compatible international format.
 *  Ghana: 0XXXXXXXXX → 233XXXXXXXXX  */
function toWaNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "233" + digits.slice(1);
  if (digits.startsWith("233")) return digits;
  return digits;
}

function buildInvoiceWaMessage(inv: { invoice_number: string; total_amount: number; due_date?: string | null; profiles?: { full_name?: string } | null; billing_name?: string | null }): string {
  const co = loadCompany();
  const name = inv.profiles?.full_name ?? (inv as any).billing_name ?? "Valued Customer";
  const due = inv.due_date ? `\nPayment due: ${format(new Date(inv.due_date), "MMM d, yyyy")}` : "";
  const phones = [co.whatsapp, co.phone].filter(Boolean).join("  |  ");
  return encodeURIComponent(
    `Hello ${name},\n\nPlease find attached Invoice *${inv.invoice_number}* for *GHS ${inv.total_amount.toFixed(2)}*.${due}\n\nThank you for your business!\n\n${co.name}\n📞 ${phones}`
  );
}

type LineItem = { description: string; quantity: string; unit_price: string };

const navGroups = [
  { label: "Overview", items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales", items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }, { title: "Bottles & Labels", url: "/staff/bottles-labels", icon: PackageOpen }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance", items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System", items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];

const statusColor: Record<string, string> = {
  draft:     "bg-secondary text-secondary-foreground",
  sent:      "bg-info/10 text-info",
  paid:      "bg-success/10 text-success",
  overdue:   "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const { data: invoices = [], isLoading } = useAllInvoices();
  const updateStatus = useUpdateInvoiceStatus();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const createInvoice = useCreateInvoice();
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useAllProducts();
  const [selected, setSelected] = useState<Invoice | null>(null);

  // Part payment state
  const { data: partPayments = [] } = usePartialPayments(selected?.id ?? null);
  const addPayment = useAddPartialPayment();
  const deletePayment = useDeletePartialPayment();
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payMomo, setPayMomo] = useState("");
  const [payRep, setPayRep] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState("");

  const handleAddPayment = async () => {
    if (!selected || !payAmount || !payRep.trim()) {
      toast({ title: "Amount and sales rep name are required", variant: "destructive" }); return;
    }
    try {
      await addPayment.mutateAsync({
        invoice_id: selected.id,
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        momo_network: payMethod === "mobile_money" ? payMomo || null : null,
        collected_by: payRep.trim(),
        received_at: payDate,
        reference: payRef || null,
        created_by: user?.id,
      });
      toast({ title: "Payment recorded" });
      setShowPayForm(false);
      setPayAmount(""); setPayRep(""); setPayRef(""); setPayMomo("");
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [clientId, setClientId] = useState("");
  const [clientMode, setClientMode] = useState<"registered" | "walkin">("registered");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInAddress, setWalkInAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  const addLine = () => setLines(l => [...l, { description: "", quantity: "1", unit_price: "" }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, k: keyof LineItem, v: string) =>
    setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const subtotal = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return s + qty * price;
  }, 0);
  const tax = subtotal * ((parseFloat(taxPercent) || 0) / 100);
  const grandTotal = subtotal + tax;

  const resetCreate = () => {
    setClientId(""); setClientMode("registered");
    setWalkInName(""); setWalkInPhone(""); setWalkInAddress("");
    setDueDate(""); setTaxPercent("0"); setNotes("");
    setLines([{ description: "", quantity: "1", unit_price: "" }]);
  };

  // Auto-fill price from product + client tier
  const pickProduct = (lineIdx: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const client = clients.find(c => c.user_id === clientId);
    const tier = (client as any)?.client_tier ?? "retail";
    const tierPrice = (prod as any)[`price_${tier}`];
    const price = tierPrice ?? prod.price;
    const desc = prod.name + ((prod as any).size ? ` (${(prod as any).size})` : "");
    setLines(l => l.map((row, idx) =>
      idx === lineIdx ? { ...row, description: desc, unit_price: String(price ?? "") } : row
    ));
  };

  const handleCreate = async () => {
    const validLines = lines.filter(l => l.description.trim() && l.unit_price);
    if (validLines.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }

    let userId: string | undefined;
    let billingName: string | undefined;
    let billingPhone: string | undefined;
    let billingAddress: string | undefined;
    let notifyPhone: string | undefined;

    if (clientMode === "registered") {
      if (!clientId) { toast({ title: "Please select a client", variant: "destructive" }); return; }
      const client = clients.find(c => c.id === clientId);
      if (!client) { toast({ title: "Client not found", variant: "destructive" }); return; }
      userId = client.user_id;
      notifyPhone = (client as any).phone ?? undefined;
    } else {
      if (!walkInName.trim()) { toast({ title: "Please enter the client name", variant: "destructive" }); return; }
      billingName = walkInName.trim();
      billingPhone = walkInPhone.trim() || undefined;
      billingAddress = walkInAddress.trim() || undefined;
      notifyPhone = billingPhone;
    }

    try {
      const invoice = await createInvoice.mutateAsync({
        userId,
        items: validLines.map(l => ({
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
        })),
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        taxPercent: parseFloat(taxPercent) || 0,
        billingName,
        billingPhone,
        billingAddress,
      });
      toast({ title: "Invoice created successfully" });
      setCreateOpen(false);
      resetCreate();

      // Auto-open WhatsApp if we have a phone number
      if (notifyPhone) {
        const waNum = toWaNumber(notifyPhone);
        const clientName = clientMode === "walkin" ? billingName : clients.find(c => c.id === clientId)?.full_name ?? "Valued Customer";
        const total = validLines.reduce((s, l) => s + (parseFloat(l.quantity) || 1) * (parseFloat(l.unit_price) || 0), 0);
        const taxAmt = total * ((parseFloat(taxPercent) || 0) / 100);
        const grandTotal = total + taxAmt;
        const due = dueDate ? `\nPayment due: ${format(new Date(dueDate), "MMM d, yyyy")}` : "";
        const co = loadCompany();
        const phones = [co.whatsapp, co.phone].filter(Boolean).join("  |  ");
        const msg = encodeURIComponent(
          `Hello ${clientName},\n\nThank you for your business! Your invoice *${(invoice as any).invoice_number ?? ""}* for *GHS ${grandTotal.toFixed(2)}* has been prepared.${due}\n\nPlease contact us for any questions.\n\n${co.name}\n📞 ${phones}`
        );
        const url = waNum ? `https://wa.me/${waNum}?text=${msg}` : `https://wa.me/?text=${msg}`;
        window.open(url, "_blank");
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: `Invoice marked as ${status}` });
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const filtered = invoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.profiles?.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = invoices
    .filter(i => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.total_amount, 0);

  const totalPaid = invoices
    .filter(i => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm">{invoices.length} total invoices</p>
          </div>
          <Button variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Invoice
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map(s => {
            const count = invoices.filter(i => i.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  filterStatus === s
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <p className="text-xs text-muted-foreground capitalize">{s}</p>
                <p className="text-xl font-bold mt-0.5">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Revenue summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-xl font-bold text-success">₵ {totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
            <p className="text-xl font-bold text-warning">₵ {totalOutstanding.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search invoice # or client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No invoices found
                    </td>
                  </tr>
                ) : filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-3">
                      <p className="font-medium">
                        {inv.profiles?.full_name || (inv as any).billing_name || "Walk-in Client"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.profiles?.company_name || inv.profiles?.email || (inv as any).billing_phone || ""}
                      </p>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(inv.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-xs">
                      {inv.due_date
                        ? <span className={new Date(inv.due_date) < new Date() && inv.status !== "paid" ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {format(new Date(inv.due_date), "MMM d, yyyy")}
                          </span>
                        : <span className="text-muted-foreground">—</span>
                      }
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
                      <button
                        onClick={() => setSelected(inv)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="p-3 text-sm text-muted-foreground">
                      {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3 text-right font-bold">
                      ₵ {filtered.reduce((s, i) => s + i.total_amount, 0).toFixed(2)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-1">
              {/* Client info + status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {selected.profiles?.full_name || (selected as any).billing_name || "Walk-in Client"}
                  </p>
                  {selected.profiles?.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3" /> {selected.profiles.email}
                    </div>
                  )}
                  {selected.profiles?.company_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Building2 className="h-3 w-3" /> {selected.profiles.company_name}
                    </div>
                  )}
                  {(selected as any).billing_phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MessageCircle className="h-3 w-3" /> {(selected as any).billing_phone}
                    </div>
                  )}
                  {(selected as any).billing_address && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(selected as any).billing_address}
                    </div>
                  )}
                </div>
                <Select value={selected.status} onValueChange={v => handleStatusChange(selected.id, v)}>
                  <SelectTrigger className={`h-8 text-xs w-36 font-medium ${statusColor[selected.status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-muted-foreground mb-0.5">Issued</p>
                  <p className="font-medium">{format(new Date(selected.created_at), "MMM d, yyyy")}</p>
                </div>
                <div className={`rounded-lg p-3 ${selected.due_date && new Date(selected.due_date) < new Date() && selected.status !== "paid" ? "bg-destructive/10" : "bg-secondary/30"}`}>
                  <p className="text-muted-foreground mb-0.5">Due</p>
                  <p className="font-medium">
                    {selected.due_date ? format(new Date(selected.due_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>

              {/* Line items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  LINE ITEMS
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

                {/* Totals */}
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

              {/* Paid date */}
              {selected.paid_date && (
                <p className="text-xs text-success font-medium">
                  Paid on {format(new Date(selected.paid_date), "MMMM d, yyyy")}
                </p>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">NOTES</p>
                  <p className="text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              {/* ── Part Payments ── */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">PAYMENTS RECEIVED</span>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                    onClick={() => { setShowPayForm(v => !v); }}>
                    <DollarSign className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>

                {/* Amount paid summary */}
                <div className="px-3 py-2 text-xs flex justify-between border-b border-border">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-bold text-green-600">
                    ₵ {((selected as any).amount_paid ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="px-3 py-1 text-xs flex justify-between border-b border-border bg-muted/20">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-bold text-orange-600">
                    ₵ {Math.max(0, selected.total_amount - ((selected as any).amount_paid ?? 0)).toFixed(2)}
                  </span>
                </div>

                {/* Add payment form */}
                {showPayForm && (
                  <div className="p-3 border-b border-border space-y-2 bg-muted/10">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount (₵) *</Label>
                        <Input type="number" min="0.01" step="0.01" className="h-8 text-sm"
                          value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date *</Label>
                        <Input type="date" className="h-8 text-sm"
                          value={payDate} onChange={e => setPayDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Payment Method *</Label>
                        <Select value={payMethod} onValueChange={v => setPayMethod(v as PaymentMethod)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                              <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {payMethod === "mobile_money" && (
                        <div className="space-y-1">
                          <Label className="text-xs">MoMo Network</Label>
                          <Select value={payMomo} onValueChange={setPayMomo}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MTN">MTN MoMo</SelectItem>
                              <SelectItem value="Vodafone">Vodafone Cash</SelectItem>
                              <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Collected by (Sales Rep) *</Label>
                        <Input className="h-8 text-sm" placeholder="Rep name"
                          value={payRep} onChange={e => setPayRep(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Receipt / Ref #</Label>
                        <Input className="h-8 text-sm" placeholder="Optional"
                          value={payRef} onChange={e => setPayRef(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="accent" className="flex-1"
                        onClick={handleAddPayment} disabled={addPayment.isPending}>
                        {addPayment.isPending ? "Saving…" : "Record Payment"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowPayForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Payment history */}
                {partPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No payments recorded yet</p>
                ) : (
                  <div className="divide-y divide-border">
                    {partPayments.map(pay => (
                      <div key={pay.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold">₵ {Number(pay.amount).toFixed(2)}
                            <span className="ml-1 font-normal text-muted-foreground">
                              via {PAYMENT_METHOD_LABELS[pay.payment_method]}
                              {pay.momo_network ? ` (${pay.momo_network})` : ""}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            {format(new Date(pay.received_at), "MMM d, yyyy")} · by {pay.collected_by}
                            {pay.reference ? ` · Ref: ${pay.reference}` : ""}
                          </p>
                        </div>
                        <button className="text-muted-foreground hover:text-destructive ml-2"
                          onClick={() => deletePayment.mutate({ id: pay.id, invoiceId: selected.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Print & WhatsApp actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 flex items-center gap-2"
                  onClick={() => printInvoice(selected)}>
                  <Printer className="h-4 w-4" /> Print / Download
                </Button>
                <Button size="sm" variant="outline" className="flex-1 flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => {
                    const phone = toWaNumber(selected.profiles?.phone);
                    const msg = buildInvoiceWaMessage(selected);
                    const url = phone
                      ? `https://wa.me/${phone}?text=${msg}`
                      : `https://wa.me/?text=${msg}`;
                    window.open(url, "_blank");
                  }}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </div>

              {/* Quick status actions */}
              <div className="flex gap-2 pt-1 border-t border-border">
                {selected.status === "draft" && (
                  <Button size="sm" variant="default" className="flex-1"
                    onClick={() => handleStatusChange(selected.id, "sent")}>
                    Mark as Sent
                  </Button>
                )}
                {(selected.status === "sent" || selected.status === "overdue") && (
                  <Button size="sm" variant="success" className="flex-1"
                    onClick={() => handleStatusChange(selected.id, "paid")}>
                    Mark as Paid
                  </Button>
                )}
                {selected.status !== "cancelled" && selected.status !== "paid" && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                    onClick={() => handleStatusChange(selected.id, "cancelled")}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); resetCreate(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Client mode toggle */}
            <div className="space-y-2">
              <Label>Client *</Label>
              <div className="flex gap-1 bg-muted/60 rounded-lg p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setClientMode("registered")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${clientMode === "registered" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
                >Registered Client</button>
                <button
                  type="button"
                  onClick={() => setClientMode("walkin")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${clientMode === "walkin" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
                >Walk-in / Manual</button>
              </div>

              {clientMode === "registered" ? (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Select a registered client…" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || c.email}
                        {c.company_name ? ` — ${c.company_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input className="h-8 text-sm" placeholder="Customer name"
                        value={walkInName} onChange={e => setWalkInName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp / Phone</Label>
                      <Input className="h-8 text-sm" placeholder="0244xxxxxxx"
                        value={walkInPhone} onChange={e => setWalkInPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Address (optional)</Label>
                    <Input className="h-8 text-sm" placeholder="Street, Town, Region"
                      value={walkInAddress} onChange={e => setWalkInAddress(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <button onClick={addLine} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add line
                </button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span className="col-span-6">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Unit Price (₵)</span>
                  <span className="col-span-1" />
                </div>

                <div className="divide-y divide-border">
                  {lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                      <div className="col-span-6 flex flex-col gap-1">
                        <Select onValueChange={v => pickProduct(i, v)}>
                          <SelectTrigger className="h-7 text-xs text-muted-foreground">
                            <SelectValue placeholder="Pick product…" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name}{(p as any).size ? ` — ${(p as any).size}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Description…"
                          value={line.description}
                          onChange={e => updateLine(i, "description", e.target.value)}
                        />
                      </div>
                      <Input
                        className="col-span-2 h-8 text-sm text-right"
                        type="number" min="0" step="0.01"
                        value={line.quantity}
                        onChange={e => updateLine(i, "quantity", e.target.value)}
                      />
                      <Input
                        className="col-span-3 h-8 text-sm text-right"
                        type="number" min="0" step="0.01"
                        placeholder="0.00"
                        value={line.unit_price}
                        onChange={e => updateLine(i, "unit_price", e.target.value)}
                      />
                      <button
                        onClick={() => removeLine(i)}
                        disabled={lines.length === 1}
                        className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals preview */}
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>₵ {subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxPercent}%)</span><span>₵ {tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-border">
                <span>Total</span><span>₵ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Due date + tax + notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tax %</Label>
                <Input
                  type="number" min="0" max="100" step="0.1"
                  value={taxPercent}
                  onChange={e => setTaxPercent(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Payment terms, delivery info…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreate(); }}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleCreate} disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
