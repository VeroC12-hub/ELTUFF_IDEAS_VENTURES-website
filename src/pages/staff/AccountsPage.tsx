import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  usePaymentAccounts, useCreatePaymentAccount, useUpdateAccountBalance,
  useDeletePaymentAccount, useExpenses, useCreateExpense, useDeleteExpense,
  Expense,
} from "@/hooks/useAccounts";
import { useAllInvoices } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3, Settings,
  ShoppingCart, UserPlus, Warehouse, CreditCard, ClipboardList,
  FlaskConical, BookOpen, Calculator, Plus, Banknote, Smartphone,
  Building2, Trash2, Pencil,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";

const navGroups = [
  { label: "Overview",   items: [{ title: "Dashboard", url: "/staff/dashboard",                   icon: LayoutDashboard }] },
  { label: "Sales",      items: [{ title: "Quotes",    url: "/staff/quotes",                      icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients",   url: "/staff/clients",                     icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production", items: [{ title: "Materials", url: "/staff/production/materials",        icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",    items: [{ title: "Accounts",  url: "/staff/accounts",                    icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",     items: [{ title: "Team",      url: "/staff/team",                        icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  cash:         Banknote,
  bank:         Building2,
  mobile_money: Smartphone,
  card:         CreditCard,
};

const ACCOUNT_COLORS: Record<string, string> = {
  cash:         "bg-success/10 border-success/20 text-success",
  bank:         "bg-primary/10 border-primary/20 text-primary",
  mobile_money: "bg-warning/10 border-warning/20 text-warning",
  card:         "bg-info/10 border-info/20 text-info",
};

const EXPENSE_CATEGORIES = [
  "materials","labour","utilities","rent","marketing","packaging","equipment","misc"
] as const;

const PIE_COLORS = ["hsl(145,45%,22%)","hsl(42,85%,50%)","hsl(152,60%,40%)","hsl(210,80%,55%)","hsl(340,65%,55%)","hsl(270,60%,55%)","hsl(30,80%,55%)","hsl(0,65%,55%)"];

export default function AccountsPage() {
  const { toast } = useToast();
  const { data: accounts  = [] } = usePaymentAccounts();
  const { data: expenses  = [] } = useExpenses();
  const { data: invoices  = [] } = useAllInvoices();
  const createAccount  = useCreatePaymentAccount();
  const updateBalance  = useUpdateAccountBalance();
  const deleteAccount  = useDeletePaymentAccount();
  const createExpense  = useCreateExpense();
  const deleteExpense  = useDeleteExpense();

  // ── Account dialog state ────────────────────────────────────────────────────
  const [addAccountOpen,    setAddAccountOpen]    = useState(false);
  const [editBalanceTarget, setEditBalanceTarget] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [newAccName,   setNewAccName]   = useState("");
  const [newAccType,   setNewAccType]   = useState("cash");
  const [newAccBal,    setNewAccBal]    = useState("0");
  const [newAccNotes,  setNewAccNotes]  = useState("");
  const [editBalVal,   setEditBalVal]   = useState("");

  const handleAddAccount = async () => {
    if (!newAccName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await createAccount.mutateAsync({
        name:         newAccName.trim(),
        account_type: newAccType,
        balance:      parseFloat(newAccBal) || 0,
        notes:        newAccNotes || undefined,
      });
      toast({ title: "Account created" });
      setAddAccountOpen(false);
      setNewAccName(""); setNewAccType("cash"); setNewAccBal("0"); setNewAccNotes("");
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleUpdateBalance = async () => {
    if (!editBalanceTarget) return;
    try {
      await updateBalance.mutateAsync({ id: editBalanceTarget.id, balance: parseFloat(editBalVal) || 0 });
      toast({ title: "Balance updated" });
      setEditBalanceTarget(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const totalBalance  = accounts.reduce((s, a) => s + a.balance, 0);

  // ── Expense filters ────────────────────────────────────────────────────────
  const [filterCat,  setFilterCat]  = useState("all");
  const [searchExp,  setSearchExp]  = useState("");

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => {
      const matchCat    = filterCat === "all" || e.category === filterCat;
      const matchSearch = e.description.toLowerCase().includes(searchExp.toLowerCase()) ||
                          (e.receipt_ref ?? "").toLowerCase().includes(searchExp.toLowerCase());
      return matchCat && matchSearch;
    }),
  [expenses, filterCat, searchExp]);

  // ── Expense category breakdown (all time) ─────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // ── Add Expense dialog state ───────────────────────────────────────────────
  const [addExpOpen,   setAddExpOpen]   = useState(false);
  const [expCategory,  setExpCategory]  = useState("misc");
  const [expDesc,      setExpDesc]      = useState("");
  const [expAmount,    setExpAmount]    = useState("");
  const [expAccount,   setExpAccount]   = useState("");
  const [expDate,      setExpDate]      = useState(format(new Date(), "yyyy-MM-dd"));
  const [expReceipt,   setExpReceipt]   = useState("");
  const [expNotes,     setExpNotes]     = useState("");

  const resetExpForm = () => {
    setExpCategory("misc"); setExpDesc(""); setExpAmount("");
    setExpAccount(""); setExpDate(format(new Date(), "yyyy-MM-dd"));
    setExpReceipt(""); setExpNotes("");
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim())   { toast({ title: "Description required", variant: "destructive" }); return; }
    if (!expAmount)        { toast({ title: "Amount required",      variant: "destructive" }); return; }
    try {
      await createExpense.mutateAsync({
        category:     expCategory,
        description:  expDesc.trim(),
        amount:       parseFloat(expAmount),
        account_id:   expAccount || null,
        expense_date: expDate,
        receipt_ref:  expReceipt || undefined,
        notes:        expNotes   || undefined,
      });
      toast({ title: "Expense logged" });
      setAddExpOpen(false);
      resetExpForm();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  // ── P&L period selector ────────────────────────────────────────────────────
  const [plPeriod, setPlPeriod] = useState<"month" | "quarter" | "year">("month");

  const plWindow = useMemo(() => {
    const now = new Date();
    if (plPeriod === "month")   return { start: startOfMonth(now), end: endOfMonth(now) };
    if (plPeriod === "quarter") return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
  }, [plPeriod]);

  const inPl = (d: string) => isWithinInterval(new Date(d), plWindow);

  const plRevenue  = useMemo(() =>
    invoices.filter(i => i.status === "paid" && inPl(i.created_at))
            .reduce((s, i) => s + i.total_amount, 0),
  [invoices, plWindow]);

  const plExpenses = useMemo(() =>
    expenses.filter(e => inPl(e.expense_date))
            .reduce((s, e) => s + e.amount, 0),
  [expenses, plWindow]);

  const plNet = plRevenue - plExpenses;

  // ── 6-month revenue vs expenses chart ─────────────────────────────────────
  const monthlyChart = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const date  = subMonths(new Date(), 5 - i);
      const s     = startOfMonth(date);
      const e     = endOfMonth(date);
      const inM   = (d: string) => isWithinInterval(new Date(d), { start: s, end: e });
      const rev   = invoices.filter(inv => inv.status === "paid" && inM(inv.created_at))
                            .reduce((sum, inv) => sum + inv.total_amount, 0);
      const exp   = expenses.filter(ex => inM(ex.expense_date))
                            .reduce((sum, ex) => sum + ex.amount, 0);
      return { month: format(date, "MMM"), revenue: rev, expenses: exp };
    }),
  [invoices, expenses]);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Accounts</h1>
            <p className="text-muted-foreground text-sm">Finance hub — balances, expenses & P&L</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Account
            </Button>
            <Button variant="accent" onClick={() => setAddExpOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Log Expense
            </Button>
          </div>
        </div>

        {/* Account balance cards */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment Accounts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {accounts.map(acc => {
              const Icon = ACCOUNT_ICONS[acc.account_type] ?? CreditCard;
              const colorCls = ACCOUNT_COLORS[acc.account_type] ?? "bg-muted border-border text-foreground";
              return (
                <div key={acc.id} className={`border rounded-xl p-4 ${colorCls}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4" />
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditBalanceTarget({ id: acc.id, name: acc.name, balance: acc.balance }); setEditBalVal(String(acc.balance)); }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        title="Edit balance"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => { await deleteAccount.mutateAsync(acc.id); toast({ title: `${acc.name} removed` }); }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        title="Remove account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium opacity-80">{acc.name}</p>
                  <p className="text-xl font-bold mt-0.5">₵ {acc.balance.toFixed(2)}</p>
                  <p className="text-xs opacity-60 capitalize mt-0.5">{acc.account_type.replace("_"," ")}</p>
                </div>
              );
            })}
            {/* Total */}
            <div className="border border-border bg-card rounded-xl p-4 flex flex-col justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Balance</p>
              <p className="text-2xl font-bold mt-2">₵ {totalBalance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* ── P&L Summary ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Profit & Loss
            </h3>
            <div className="flex gap-1">
              {(["month","quarter","year"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    plPeriod === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : "This Year"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-success/5 border border-success/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Revenue (paid invoices)</p>
              <p className="text-2xl font-bold text-success mt-1">₵ {plRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-destructive mt-1">₵ {plExpenses.toFixed(2)}</p>
            </div>
            <div className={`border rounded-xl p-4 ${plNet >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20"}`}>
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${plNet >= 0 ? "text-primary" : "text-warning"}`}>
                ₵ {plNet.toFixed(2)}
              </p>
              {plRevenue > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {((plNet / plRevenue) * 100).toFixed(1)}% margin
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Revenue vs Expenses chart ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold mb-4">Revenue vs Expenses — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140,10%,90%)" />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={v => `₵${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => [`₵ ${v.toFixed(2)}`, name === "revenue" ? "Revenue" : "Expenses"]} />
              <Legend formatter={v => v === "revenue" ? "Revenue" : "Expenses"} />
              <Bar dataKey="revenue"  fill="hsl(145,45%,22%)" radius={[4,4,0,0]} name="revenue" />
              <Bar dataKey="expenses" fill="hsl(0,65%,55%)"   radius={[4,4,0,0]} name="expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Expense ledger + category breakdown ─────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Expense table */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-display font-semibold">Expense Ledger</h3>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Search…"
                  value={searchExp}
                  onChange={e => setSearchExp(e.target.value)}
                  className="h-8 text-xs w-36"
                />
                <Select value={filterCat} onValueChange={setFilterCat}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                        No expenses logged yet — click "Log Expense" to add one
                      </td>
                    </tr>
                  ) : filteredExpenses.map(exp => (
                    <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(exp.expense_date), "MMM d, yyyy")}
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{exp.description}</p>
                        {exp.receipt_ref && (
                          <p className="text-xs text-muted-foreground">Ref: {exp.receipt_ref}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-muted text-muted-foreground">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {exp.payment_accounts?.name ?? "—"}
                      </td>
                      <td className="p-3 text-right font-semibold text-destructive">
                        ₵ {exp.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            await deleteExpense.mutateAsync(exp.id);
                            toast({ title: "Expense deleted" });
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={4} className="p-3 text-sm text-muted-foreground">
                        {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
                      </td>
                      <td className="p-3 text-right font-bold text-destructive">
                        ₵ {filteredExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Category breakdown pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-display font-semibold mb-4">By Category</h3>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%"
                      innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`₵ ${v.toFixed(2)}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {categoryBreakdown.map((c, i) => (
                    <div key={c.name} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground capitalize">{c.name}</span>
                        </div>
                        <span className="font-medium">₵ {c.value.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${c.pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Add Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Payment Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input placeholder="e.g. Ecobank Savings" value={newAccName} onChange={e => setNewAccName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newAccType} onValueChange={setNewAccType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Opening Balance (₵)</Label>
              <Input type="number" min="0" step="0.01" value={newAccBal} onChange={e => setNewAccBal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={newAccNotes} onChange={e => setNewAccNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAccountOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleAddAccount} disabled={createAccount.isPending}>
              {createAccount.isPending ? "Adding…" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={!!editBalanceTarget} onOpenChange={o => !o && setEditBalanceTarget(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Update Balance — {editBalanceTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Current Balance (₵)</Label>
            <Input type="number" step="0.01" value={editBalVal} onChange={e => setEditBalVal(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBalanceTarget(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleUpdateBalance} disabled={updateBalance.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={addExpOpen} onOpenChange={o => { if (!o) { setAddExpOpen(false); resetExpForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={expCategory} onValueChange={setExpCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                placeholder="What was this expense for?"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₵) *</Label>
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="0.00"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Paid from Account</Label>
                <Select value={expAccount} onValueChange={setExpAccount}>
                  <SelectTrigger><SelectValue placeholder="— optional —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Receipt / Reference</Label>
              <Input
                placeholder="Invoice #, receipt number…"
                value={expReceipt}
                onChange={e => setExpReceipt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Additional details…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddExpOpen(false); resetExpForm(); }}>Cancel</Button>
            <Button variant="accent" onClick={handleAddExpense} disabled={createExpense.isPending}>
              {createExpense.isPending ? "Saving…" : "Log Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
