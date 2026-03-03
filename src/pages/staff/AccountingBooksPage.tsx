import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePaymentAccounts, useExpenses } from "@/hooks/useAccounts";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useAllPartialPayments } from "@/hooks/usePartialPayments";
import { usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase } from "@/hooks/usePurchases";
import { useCreditors, useCreateCreditor, useUpdateCreditor, useDeleteCreditor } from "@/hooks/useCreditors";
import { usePayroll, useCreatePayrollEntry, useUpdatePayrollEntry, useDeletePayrollEntry, MONTH_NAMES } from "@/hooks/usePayroll";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Loader2, Info, ExternalLink } from "lucide-react";

import navGroups from "@/lib/staffNavGroups";

// ── Shared helpers ──────────────────────────────────────────────────────────
const GHS = (n: number) => `₵ ${n.toFixed(2)}`;

const InfoBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
    <span>{children}</span>
  </div>
);
const fmtDate = (d: string) => { try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; } };

const EmptyRow = ({ cols, msg }: { cols: number; msg: string }) => (
  <tr><td colSpan={cols} className="p-8 text-center text-muted-foreground text-sm">{msg}</td></tr>
);

const SkeletonRows = ({ cols, rows = 5 }: { cols: number; rows?: number }) => (
  <>
    {[...Array(rows)].map((_, i) => (
      <tr key={i} className="border-b border-border/50">
        {[...Array(cols)].map((_, j) => (
          <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
        ))}
      </tr>
    ))}
  </>
);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: "bg-success/10 text-success",
    unpaid: "bg-destructive/10 text-destructive",
    partial: "bg-warning/10 text-warning",
    overdue: "bg-destructive/10 text-destructive",
    completed: "bg-success/10 text-success",
    in_progress: "bg-info/10 text-info",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-secondary text-secondary-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

// ── Cash / Bank Book ────────────────────────────────────────────────────────
function CashBankBook({ accountType }: { accountType: "cash" | "bank" }) {
  const { data: accounts = [] } = usePaymentAccounts();
  const { data: expenses = [], isLoading: expLoading } = useExpenses();
  const { data: payments = [], isLoading: payLoading } = useAllPartialPayments();

  const matchAccounts = accounts.filter(a => a.account_type === accountType);
  const matchIds = new Set(matchAccounts.map(a => a.id));

  const methodMap: Record<string, boolean> = accountType === "cash"
    ? { cash: true }
    : { bank_transfer: true };

  type Entry = { date: string; description: string; moneyIn: number; moneyOut: number; ref: string };

  const entries: Entry[] = useMemo(() => {
    const rows: Entry[] = [];

    // Money OUT: expenses via matching accounts
    expenses
      .filter(e => e.account_id && matchIds.has(e.account_id))
      .forEach(e => rows.push({
        date: e.expense_date,
        description: `${e.category.toUpperCase()} — ${e.description}`,
        moneyIn: 0,
        moneyOut: e.amount,
        ref: e.receipt_ref ?? "",
      }));

    // Money IN: invoice payments via matching method
    payments
      .filter(p => methodMap[p.payment_method])
      .forEach(p => rows.push({
        date: p.received_at.slice(0, 10),
        description: `Payment received — ${(p as any).invoices?.invoice_number ?? "Invoice"}`,
        moneyIn: p.amount,
        moneyOut: 0,
        ref: p.reference ?? "",
      }));

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses, payments, matchIds, methodMap]);

  // Running balance
  let balance = 0;
  const withBalance = entries.map(e => {
    balance += e.moneyIn - e.moneyOut;
    return { ...e, balance };
  });

  const isLoading = expLoading || payLoading;
  const totalIn  = entries.reduce((s, e) => s + e.moneyIn, 0);
  const totalOut = entries.reduce((s, e) => s + e.moneyOut, 0);

  return (
    <div className="space-y-4">
      <InfoBanner>
        This book is updated <strong>automatically</strong>. Money In comes from payments recorded on invoices (cash / bank transfer). Money Out comes from expenses added in{" "}
        <Link to="/staff/accounts" className="underline font-semibold">Finance → Accounts</Link>.
        To add a new entry, record a payment on an invoice or add an expense there.
      </InfoBanner>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Money In",  value: GHS(totalIn),  color: "text-success" },
          { label: "Total Money Out", value: GHS(totalOut), color: "text-destructive" },
          { label: "Net Balance",     value: GHS(totalIn - totalOut), color: totalIn - totalOut >= 0 ? "text-success" : "text-destructive" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-success">Money In</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-destructive">Money Out</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ref</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={6} /> :
               withBalance.length === 0 ? <EmptyRow cols={6} msg="No transactions yet" /> :
               withBalance.map((e, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{fmtDate(e.date)}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right text-success font-medium">{e.moneyIn > 0 ? GHS(e.moneyIn) : "—"}</td>
                  <td className="p-3 text-right text-destructive font-medium">{e.moneyOut > 0 ? GHS(e.moneyOut) : "—"}</td>
                  <td className={`p-3 text-right font-bold ${e.balance >= 0 ? "text-success" : "text-destructive"}`}>{GHS(e.balance)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{e.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sales Book ──────────────────────────────────────────────────────────────
function SalesBook() {
  const { data: invoices = [], isLoading } = useAllInvoices();
  const [search, setSearch] = useState("");

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const client = inv.profiles?.full_name || (inv as any).billing_name || "";
    return inv.invoice_number.toLowerCase().includes(q) || client.toLowerCase().includes(q);
  });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="space-y-4">
      <InfoBanner>
        This book is updated <strong>automatically</strong> from your invoices. To add a new sales entry, create an invoice in{" "}
        <Link to="/staff/invoices" className="underline font-semibold">Sales → Invoices</Link>.
      </InfoBanner>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoices", value: String(invoices.length), color: "" },
          { label: "Revenue Collected", value: GHS(totalRevenue), color: "text-success" },
          { label: "Outstanding", value: GHS(invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.total_amount, 0)), color: "text-warning" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <Input placeholder="Search by invoice no or client…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Invoice No</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={5} /> :
               filtered.length === 0 ? <EmptyRow cols={5} msg="No invoices found" /> :
               filtered.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{fmtDate(inv.created_at)}</td>
                  <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="p-3">{inv.profiles?.full_name || (inv as any).billing_name || "Walk-in"}</td>
                  <td className="p-3">{statusBadge(inv.status)}</td>
                  <td className="p-3 text-right font-medium">{GHS(inv.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Purchases Book ──────────────────────────────────────────────────────────
function PurchasesBook() {
  const { data: purchases = [], isLoading } = usePurchases();
  const { data: accounts = [] } = usePaymentAccounts();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const deletePurchase = useDeletePurchase();
  const { toast } = useToast();

  const empty = { date: new Date().toISOString().slice(0, 10), supplier: "", item: "", quantity: "", unit: "", unit_cost: "", account_id: "", reference: "", notes: "" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (p: any) => {
    setForm({ date: p.date, supplier: p.supplier, item: p.item, quantity: String(p.quantity), unit: p.unit ?? "", unit_cost: String(p.unit_cost), account_id: p.account_id ?? "", reference: p.reference ?? "", notes: p.notes ?? "" });
    setEditId(p.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.supplier || !form.item || !form.quantity || !form.unit_cost) {
      toast({ title: "Fill in supplier, item, quantity and unit cost", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = { date: form.date, supplier: form.supplier, item: form.item, quantity: parseFloat(form.quantity), unit: form.unit || null, unit_cost: parseFloat(form.unit_cost), account_id: form.account_id || null, reference: form.reference || null, notes: form.notes || null };
      if (editId) await updatePurchase.mutateAsync({ id: editId, ...payload });
      else await createPurchase.mutateAsync(payload);
      toast({ title: editId ? "Purchase updated" : "Purchase recorded" });
      setOpen(false);
    } catch { toast({ title: "Error saving purchase", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this purchase entry?")) return;
    await deletePurchase.mutateAsync(id);
    toast({ title: "Entry deleted" });
  };

  const totalCost = purchases.reduce((s, p) => s + p.total_cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 flex-1 mr-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Purchases</p>
            <p className="text-xl font-bold">{purchases.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-xl font-bold text-destructive">{GHS(totalCost)}</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Purchase</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Unit Cost</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={8} /> :
               purchases.length === 0 ? <EmptyRow cols={8} msg="No purchases recorded yet" /> :
               purchases.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{fmtDate(p.date)}</td>
                  <td className="p-3 font-medium">{p.supplier}</td>
                  <td className="p-3">{p.item}</td>
                  <td className="p-3 text-right">{p.quantity} {p.unit}</td>
                  <td className="p-3 text-right">{GHS(p.unit_cost)}</td>
                  <td className="p-3 text-right font-medium">{GHS(p.total_cost)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{(p as any).payment_accounts?.name ?? "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Purchase" : "Record Purchase"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { label: "Date", key: "date", type: "date" },
              { label: "Supplier *", key: "supplier", type: "text", placeholder: "e.g. Accra Chemicals Ltd" },
              { label: "Item *", key: "item", type: "text", placeholder: "e.g. Caustic Soda" },
              { label: "Quantity *", key: "quantity", type: "number", placeholder: "0" },
              { label: "Unit (optional)", key: "unit", type: "text", placeholder: "e.g. kg, litres, bags" },
              { label: "Unit Cost (GHS) *", key: "unit_cost", type: "number", placeholder: "0.00" },
              { label: "Reference / Receipt", key: "reference", type: "text", placeholder: "Receipt number" },
              { label: "Notes", key: "notes", type: "text", placeholder: "Optional notes" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} className="mt-1 h-9" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Paid from Account</label>
              <Select value={form.account_id || undefined} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Debtors Book ────────────────────────────────────────────────────────────
function DebtorsBook() {
  const { data: invoices = [], isLoading } = useAllInvoices();
  const debtors = invoices.filter(inv => inv.status !== "paid" && inv.status !== "cancelled");
  const totalOwed = debtors.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = debtors.reduce((s, i) => s + ((i as any).amount_paid ?? 0), 0);

  return (
    <div className="space-y-4">
      <InfoBanner>
        This book is updated <strong>automatically</strong> from unpaid invoices. To mark a customer as paid, open their invoice in{" "}
        <Link to="/staff/invoices" className="underline font-semibold">Sales → Invoices</Link> and record the payment.
      </InfoBanner>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Debtors", value: String(debtors.length), color: "" },
          { label: "Total Amount Owed", value: GHS(totalOwed), color: "text-destructive" },
          { label: "Balance Outstanding", value: GHS(totalOwed - totalPaid), color: "text-warning" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Invoice No</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount Owed</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Paid</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={7} /> :
               debtors.length === 0 ? <EmptyRow cols={7} msg="No outstanding debtors" /> :
               debtors.map(inv => {
                const amtPaid = (inv as any).amount_paid ?? 0;
                const balance = inv.total_amount - amtPaid;
                return (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground">{fmtDate(inv.created_at)}</td>
                    <td className="p-3 font-medium">{inv.profiles?.full_name || (inv as any).billing_name || "Walk-in"}</td>
                    <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="p-3 text-right">{GHS(inv.total_amount)}</td>
                    <td className="p-3 text-right text-success">{GHS(amtPaid)}</td>
                    <td className="p-3 text-right font-bold text-destructive">{GHS(balance)}</td>
                    <td className="p-3">{statusBadge(inv.status)}</td>
                  </tr>
                );
               })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Creditors Book ──────────────────────────────────────────────────────────
function CreditorsBook() {
  const { data: creditors = [], isLoading } = useCreditors();
  const createCreditor = useCreateCreditor();
  const updateCreditor = useUpdateCreditor();
  const deleteCreditor = useDeleteCreditor();
  const { toast } = useToast();

  const empty = { supplier_name: "", date: new Date().toISOString().slice(0, 10), description: "", amount_owed: "", amount_paid: "0", due_date: "", status: "unpaid", notes: "" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (c: any) => {
    setForm({ supplier_name: c.supplier_name, date: c.date, description: c.description, amount_owed: String(c.amount_owed), amount_paid: String(c.amount_paid), due_date: c.due_date ?? "", status: c.status, notes: c.notes ?? "" });
    setEditId(c.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.supplier_name || !form.description || !form.amount_owed) {
      toast({ title: "Fill in supplier, description and amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = { supplier_name: form.supplier_name, date: form.date, description: form.description, amount_owed: parseFloat(form.amount_owed), amount_paid: parseFloat(form.amount_paid || "0"), due_date: form.due_date || null, status: form.status, notes: form.notes || null };
      if (editId) await updateCreditor.mutateAsync({ id: editId, ...payload });
      else await createCreditor.mutateAsync(payload);
      toast({ title: editId ? "Updated" : "Creditor recorded" });
      setOpen(false);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await deleteCreditor.mutateAsync(id);
    toast({ title: "Deleted" });
  };

  const totalOwed = creditors.reduce((s, c) => s + c.amount_owed, 0);
  const totalPaid = creditors.reduce((s, c) => s + c.amount_paid, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
          {[
            { label: "Total Owed to Suppliers", value: GHS(totalOwed), color: "text-destructive" },
            { label: "Total Paid", value: GHS(totalPaid), color: "text-success" },
            { label: "Balance Due", value: GHS(totalOwed - totalPaid), color: "text-warning" },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Creditor</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Owed</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Paid</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={8} /> :
               creditors.length === 0 ? <EmptyRow cols={8} msg="No creditors recorded yet" /> :
               creditors.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{fmtDate(c.date)}</td>
                  <td className="p-3 font-medium">{c.supplier_name}</td>
                  <td className="p-3">{c.description}</td>
                  <td className="p-3 text-right text-destructive">{GHS(c.amount_owed)}</td>
                  <td className="p-3 text-right text-success">{GHS(c.amount_paid)}</td>
                  <td className="p-3 text-right font-bold">{GHS(c.amount_owed - c.amount_paid)}</td>
                  <td className="p-3">{statusBadge(c.status)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Creditor" : "Add Creditor"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { label: "Supplier Name *", key: "supplier_name", type: "text", placeholder: "Supplier name" },
              { label: "Date", key: "date", type: "date" },
              { label: "Description *", key: "description", type: "text", placeholder: "What was purchased on credit" },
              { label: "Amount Owed (GHS) *", key: "amount_owed", type: "number", placeholder: "0.00" },
              { label: "Amount Paid (GHS)", key: "amount_paid", type: "number", placeholder: "0.00" },
              { label: "Due Date", key: "due_date", type: "date" },
              { label: "Notes", key: "notes", type: "text", placeholder: "Optional" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} className="mt-1 h-9" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Expense Book ────────────────────────────────────────────────────────────
function ExpenseBook() {
  const { data: expenses = [], isLoading } = useExpenses();
  const [search, setSearch] = useState("");

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <InfoBanner>
          This book is updated <strong>automatically</strong> when expenses are added in Finance → Accounts.
          Click the button on the right to go there and add a new expense.
        </InfoBanner>
        <Link to="/staff/accounts">
          <Button type="button" size="sm" variant="outline" className="gap-1.5 whitespace-nowrap">
            <ExternalLink className="h-3.5 w-3.5" /> Go to Finance → Accounts
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-xl font-bold">{expenses.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className="text-xl font-bold text-destructive">{GHS(total)}</p>
        </div>
      </div>

      <Input placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={5} /> :
               filtered.length === 0 ? <EmptyRow cols={5} msg="No expenses found" /> :
               filtered.map(e => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{fmtDate(e.expense_date)}</td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">{e.category}</span>
                  </td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-xs text-muted-foreground">{(e as any).payment_accounts?.name ?? "—"}</td>
                  <td className="p-3 text-right font-medium text-destructive">{GHS(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Payroll Book ────────────────────────────────────────────────────────────
function PayrollBook() {
  const { data: entries = [], isLoading } = usePayroll();
  const { data: staffMembers = [] } = useStaffMembers();
  const { data: accounts = [] } = usePaymentAccounts();
  const createEntry = useCreatePayrollEntry();
  const updateEntry = useUpdatePayrollEntry();
  const deleteEntry = useDeletePayrollEntry();
  const { toast } = useToast();

  const now = new Date();
  const empty = { period_month: String(now.getMonth() + 1), period_year: String(now.getFullYear()), employee_name: "", staff_member_id: "", basic_salary: "", overtime: "0", deductions: "0", payment_date: "", account_id: "", notes: "" };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (e: any) => {
    setForm({ period_month: String(e.period_month), period_year: String(e.period_year), employee_name: e.employee_name, staff_member_id: e.staff_member_id ?? "", basic_salary: String(e.basic_salary), overtime: String(e.overtime), deductions: String(e.deductions), payment_date: e.payment_date ?? "", account_id: e.account_id ?? "", notes: e.notes ?? "" });
    setEditId(e.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_name || !form.basic_salary) {
      toast({ title: "Employee name and basic salary are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = { period_month: parseInt(form.period_month), period_year: parseInt(form.period_year), employee_name: form.employee_name, staff_member_id: form.staff_member_id || null, basic_salary: parseFloat(form.basic_salary || "0"), overtime: parseFloat(form.overtime || "0"), deductions: parseFloat(form.deductions || "0"), payment_date: form.payment_date || null, account_id: form.account_id || null, notes: form.notes || null };
      if (editId) await updateEntry.mutateAsync({ id: editId, ...payload });
      else await createEntry.mutateAsync(payload);
      toast({ title: editId ? "Updated" : "Payroll entry saved" });
      setOpen(false);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payroll entry?")) return;
    await deleteEntry.mutateAsync(id);
    toast({ title: "Deleted" });
  };

  const totalNetPay = entries.reduce((s, e) => s + e.net_pay, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4 flex-1 mr-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Payroll Entries</p>
            <p className="text-xl font-bold">{entries.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Net Pay</p>
            <p className="text-xl font-bold text-destructive">{GHS(totalNetPay)}</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Entry</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Period</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Basic</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Overtime</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Deductions</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Net Pay</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Paid Date</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <SkeletonRows cols={8} /> :
               entries.length === 0 ? <EmptyRow cols={8} msg="No payroll entries yet" /> :
               entries.map(e => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{MONTH_NAMES[e.period_month - 1]} {e.period_year}</td>
                  <td className="p-3 font-medium">{e.employee_name}</td>
                  <td className="p-3 text-right">{GHS(e.basic_salary)}</td>
                  <td className="p-3 text-right text-success">{GHS(e.overtime)}</td>
                  <td className="p-3 text-right text-destructive">{GHS(e.deductions)}</td>
                  <td className="p-3 text-right font-bold">{GHS(e.net_pay)}</td>
                  <td className="p-3 text-muted-foreground text-xs">{e.payment_date ? fmtDate(e.payment_date) : "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Payroll Entry" : "Add Payroll Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Month *</label>
                <Select value={form.period_month} onValueChange={v => setForm(f => ({ ...f, period_month: v }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Year *</label>
                <Input type="number" value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Employee *</label>
              {staffMembers.length > 0 ? (
                <Select value={form.staff_member_id || "__manual__"} onValueChange={v => {
                  if (v === "__manual__") { setForm(f => ({ ...f, staff_member_id: "", employee_name: "" })); return; }
                  const sm = staffMembers.find(s => s.id === v);
                  setForm(f => ({ ...f, staff_member_id: v, employee_name: sm?.full_name ?? "", basic_salary: sm ? String(sm.basic_salary) : f.basic_salary }));
                }}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Type name manually</SelectItem>
                    {staffMembers.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              {(!form.staff_member_id || staffMembers.length === 0) && (
                <Input placeholder="Employee name" value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} className="mt-1 h-9" />
              )}
            </div>
            {[
              { label: "Basic Salary (GHS) *", key: "basic_salary", placeholder: "0.00" },
              { label: "Overtime (GHS)", key: "overtime", placeholder: "0.00" },
              { label: "Deductions (GHS)", key: "deductions", placeholder: "0.00" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Input type="number" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} className="mt-1 h-9" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Net Pay (auto)</label>
              <p className="text-lg font-bold text-success mt-1">
                {GHS(Math.max(0, parseFloat(form.basic_salary || "0") + parseFloat(form.overtime || "0") - parseFloat(form.deductions || "0")))}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Paid from Account</label>
              <Select value={form.account_id || undefined} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 h-9" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AccountingBooksPage() {
  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Accounting Books</h1>
          <p className="text-muted-foreground text-sm">Core financial records for ELTUFF IDEAS VENTURES</p>
        </div>

        <Tabs defaultValue="cash">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="cash">Cash Book</TabsTrigger>
            <TabsTrigger value="bank">Bank Book</TabsTrigger>
            <TabsTrigger value="sales">Sales Book</TabsTrigger>
            <TabsTrigger value="purchases">Purchases Book</TabsTrigger>
            <TabsTrigger value="debtors">Debtors Book</TabsTrigger>
            <TabsTrigger value="creditors">Creditors Book</TabsTrigger>
            <TabsTrigger value="expenses">Expense Book</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Book</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="cash">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Cash Book</h2>
                <p className="text-xs text-muted-foreground">Daily cash receipts and payments — updated automatically from invoices and expenses</p>
              </div>
              <CashBankBook accountType="cash" />
            </TabsContent>

            <TabsContent value="bank">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Bank Book</h2>
                <p className="text-xs text-muted-foreground">Bank transactions — deposits, withdrawals, transfers and bank charges</p>
              </div>
              <CashBankBook accountType="bank" />
            </TabsContent>

            <TabsContent value="sales">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Sales Book (Revenue Book)</h2>
                <p className="text-xs text-muted-foreground">All products and services sold — cash and credit</p>
              </div>
              <SalesBook />
            </TabsContent>

            <TabsContent value="purchases">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Purchases Book (Buying Book)</h2>
                <p className="text-xs text-muted-foreground">Everything bought for production or operations</p>
              </div>
              <PurchasesBook />
            </TabsContent>

            <TabsContent value="debtors">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Debtors Book</h2>
                <p className="text-xs text-muted-foreground">Customers who owe money — outstanding invoices</p>
              </div>
              <DebtorsBook />
            </TabsContent>

            <TabsContent value="creditors">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Creditors Book</h2>
                <p className="text-xs text-muted-foreground">Suppliers you owe money to — purchases made on credit</p>
              </div>
              <CreditorsBook />
            </TabsContent>

            <TabsContent value="expenses">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Expense Book</h2>
                <p className="text-xs text-muted-foreground">All business expenses — rent, fuel, utilities, repairs, salaries</p>
              </div>
              <ExpenseBook />
            </TabsContent>

            <TabsContent value="payroll">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Payroll / Salary Book</h2>
                <p className="text-xs text-muted-foreground">Monthly staff salary records with overtime and deductions</p>
              </div>
              <PayrollBook />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
