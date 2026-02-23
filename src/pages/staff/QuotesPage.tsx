import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllQuotes, useCreateQuote, useUpdateQuoteStatus, useConvertQuoteToInvoice, Quote } from "@/hooks/useQuotes";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3, Settings,
  ShoppingCart, UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator, Plus, Trash2,
  Mail, Building2, FileText,
} from "lucide-react";
import { format } from "date-fns";

type LineItem = { description: string; quantity: string; unit_price: string };

const navGroups = [
  { label: "Overview",    items: [{ title: "Dashboard",  url: "/staff/dashboard",                    icon: LayoutDashboard }] },
  { label: "Sales",       items: [{ title: "Quotes",     url: "/staff/quotes",                       icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management",  items: [{ title: "Clients",    url: "/staff/clients",                      icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",         icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",     items: [{ title: "Accounts",   url: "/staff/accounts",                     icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",      items: [{ title: "Team",       url: "/staff/team",                         icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;

export const statusColor: Record<string, string> = {
  draft:    "bg-secondary text-secondary-foreground",
  sent:     "bg-info/10 text-info",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  expired:  "bg-muted text-muted-foreground",
};

export default function QuotesPage() {
  const { toast } = useToast();
  const { data: quotes = [], isLoading } = useAllQuotes();
  const { data: clients = [] } = useClients();
  const createQuote   = useCreateQuote();
  const updateStatus  = useUpdateQuoteStatus();
  const convertToInv  = useConvertQuoteToInvoice();

  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected]         = useState<Quote | null>(null);
  const [createOpen, setCreateOpen]     = useState(false);

  // ── Create form state ──────────────────────────────────────────────────────
  const [clientId,    setClientId]    = useState("");
  const [validUntil,  setValidUntil]  = useState("");
  const [taxPercent,  setTaxPercent]  = useState("0");
  const [notes,       setNotes]       = useState("");
  const [lines,       setLines]       = useState<LineItem[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  const addLine    = () => setLines(l => [...l, { description: "", quantity: "1", unit_price: "" }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, k: keyof LineItem, v: string) =>
    setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const subtotal   = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const taxAmt     = subtotal * ((parseFloat(taxPercent) || 0) / 100);
  const grandTotal = subtotal + taxAmt;

  const resetCreate = () => {
    setClientId(""); setValidUntil(""); setTaxPercent("0"); setNotes("");
    setLines([{ description: "", quantity: "1", unit_price: "" }]);
  };

  const handleCreate = async () => {
    if (!clientId) { toast({ title: "Please select a client", variant: "destructive" }); return; }
    const validLines = lines.filter(l => l.description.trim() && l.unit_price);
    if (!validLines.length) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    try {
      await createQuote.mutateAsync({
        clientId,
        items: validLines.map(l => ({
          description: l.description.trim(),
          quantity:    parseFloat(l.quantity)   || 1,
          unit_price:  parseFloat(l.unit_price) || 0,
        })),
        taxPercent:  parseFloat(taxPercent) || 0,
        validUntil:  validUntil || undefined,
        notes:       notes || undefined,
      });
      toast({ title: "Quote created successfully" });
      setCreateOpen(false);
      resetCreate();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: `Quote marked as ${status}` });
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleConvert = async () => {
    if (!selected) return;
    try {
      await convertToInv.mutateAsync({ quote: selected });
      toast({ title: "Invoice created from quote", description: "Quote marked as accepted." });
      setSelected(null);
    } catch (e: unknown) {
      toast({ title: "Conversion failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalQuotes     = quotes.length;
  const acceptedValue   = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + q.total_amount, 0);
  const pendingCount    = quotes.filter(q => q.status === "draft" || q.status === "sent").length;
  const sentCount       = quotes.filter(q => q.status === "sent" || q.status === "accepted" || q.status === "rejected").length;
  const conversionRate  = sentCount > 0
    ? ((quotes.filter(q => q.status === "accepted").length / sentCount) * 100).toFixed(0)
    : "0";

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = quotes.filter(q => {
    const term = search.toLowerCase();
    const matchSearch =
      q.quote_number.toLowerCase().includes(term) ||
      (q.profiles?.full_name ?? "").toLowerCase().includes(term) ||
      (q.profiles?.email ?? "").toLowerCase().includes(term);
    const matchStatus = filterStatus === "all" || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Quotes</h1>
            <p className="text-muted-foreground text-sm">{totalQuotes} total quotes</p>
          </div>
          <Button variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Quote
          </Button>
        </div>

        {/* Status filter chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(["all", ...STATUSES] as const).map(s => {
            const count = s === "all" ? totalQuotes : quotes.filter(q => q.status === s).length;
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

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Quotes</p>
            <p className="text-2xl font-bold mt-0.5">{totalQuotes}</p>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Accepted Value</p>
            <p className="text-2xl font-bold mt-0.5 text-success">₵ {acceptedValue.toFixed(2)}</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-0.5 text-warning">{pendingCount}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold mt-0.5 text-primary">{conversionRate}%</p>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search quote # or client…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Table placeholder — filled in 3.3b */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Quote #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Valid Until</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
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
                      No quotes found
                    </td>
                  </tr>
                ) : filtered.map(q => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{q.quote_number}</td>
                    <td className="p-3">
                      <p className="font-medium">{q.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{q.profiles?.company_name || q.profiles?.email}</p>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(q.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-xs">
                      {q.valid_until
                        ? <span className={new Date(q.valid_until) < new Date() && q.status === "sent" ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {format(new Date(q.valid_until), "MMM d, yyyy")}
                          </span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 text-right font-semibold">₵ {q.total_amount.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[q.status]}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setSelected(q)} className="text-xs text-primary hover:underline font-medium">
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
                      {filtered.length} quote{filtered.length !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3 text-right font-bold">
                      ₵ {filtered.reduce((s, q) => s + q.total_amount, 0).toFixed(2)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* Create Quote Dialog */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); resetCreate(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Client */}
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select a client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.user_id}>
                      {c.full_name || c.email}{c.company_name ? ` — ${c.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      <Input
                        className="col-span-6 h-8 text-sm"
                        placeholder="Description…"
                        value={line.description}
                        onChange={e => updateLine(i, "description", e.target.value)}
                      />
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

            {/* Live totals preview */}
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>₵ {subtotal.toFixed(2)}</span>
              </div>
              {taxAmt > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxPercent}%)</span><span>₵ {taxAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-border">
                <span>Total</span><span>₵ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Valid until + tax % */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valid Until</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
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

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Delivery terms, scope of work, validity conditions…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreate(); }}>Cancel</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createQuote.isPending}>
              {createQuote.isPending ? "Creating…" : "Create Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selected?.quote_number}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              {/* Client info + status selector */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{selected.profiles?.full_name || "Unknown"}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Mail className="h-3 w-3" /> {selected.profiles?.email}
                  </div>
                  {selected.profiles?.company_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Building2 className="h-3 w-3" /> {selected.profiles.company_name}
                    </div>
                  )}
                </div>
                <Select value={selected.status} onValueChange={v => handleStatusChange(selected.id, v)}>
                  <SelectTrigger className={`h-8 text-xs w-36 font-medium capitalize ${statusColor[selected.status]}`}>
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
                <div className={`rounded-lg p-3 ${
                  selected.valid_until && new Date(selected.valid_until) < new Date() && selected.status === "sent"
                    ? "bg-destructive/10" : "bg-secondary/30"
                }`}>
                  <p className="text-muted-foreground mb-0.5">Valid Until</p>
                  <p className="font-medium">
                    {selected.valid_until ? format(new Date(selected.valid_until), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>

              {/* Line items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Line Items
                </div>
                {(selected.quote_items ?? []).length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">No line items</p>
                ) : (
                  <div className="divide-y divide-border">
                    {(selected.quote_items ?? []).map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × ₵ {Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">₵ {Number(item.total_price).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-border divide-y divide-border/50">
                  <div className="flex justify-between px-3 py-2 text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₵ {Number(selected.subtotal).toFixed(2)}</span>
                  </div>
                  {selected.tax_amount > 0 && (
                    <div className="flex justify-between px-3 py-2 text-sm text-muted-foreground">
                      <span>Tax ({selected.tax_pct}%)</span>
                      <span>₵ {Number(selected.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2.5 text-sm font-bold bg-muted/30">
                    <span>Total</span>
                    <span>₵ {Number(selected.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
                  <p className="text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                {selected.status === "draft" && (
                  <Button size="sm" variant="default" className="flex-1"
                    onClick={() => handleStatusChange(selected.id, "sent")}>
                    Mark as Sent
                  </Button>
                )}
                {selected.status === "sent" && (
                  <>
                    <Button size="sm" variant="success" className="flex-1"
                      onClick={() => handleStatusChange(selected.id, "accepted")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleStatusChange(selected.id, "rejected")}>
                      Reject
                    </Button>
                  </>
                )}
                {selected.status === "sent" && (
                  <Button size="sm" variant="outline" className="text-muted-foreground"
                    onClick={() => handleStatusChange(selected.id, "expired")}>
                    Mark Expired
                  </Button>
                )}

                {/* Convert to Invoice — only for accepted or sent quotes */}
                {(selected.status === "accepted" || selected.status === "sent") && (
                  <Button
                    size="sm"
                    variant="accent"
                    className="w-full mt-1"
                    onClick={handleConvert}
                    disabled={convertToInv.isPending}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {convertToInv.isPending ? "Converting…" : "Convert to Invoice"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
