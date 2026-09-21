import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useExpenses, useCreateExpense, useDeleteExpense, EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import retailNavGroups from "@/lib/retailNavGroups";
import { Plus, Trash2 } from "lucide-react";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function RetailExpensesPage() {
  const { toast } = useToast();
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ expense_date: todayStr(), description: "", amount: "", category: "other" });

  const monthTotal = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.expense_date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) {
      toast({ title: "Description and amount are required", variant: "destructive" }); return;
    }
    try {
      await createExpense.mutateAsync({
        expense_date: form.expense_date,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
      });
      toast({ title: "Expense added" });
      setDialogOpen(false);
      setForm({ expense_date: todayStr(), description: "", amount: "", category: "other" });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteExpense.mutateAsync(deleting);
      toast({ title: "Expense removed" });
      setDeleting(null);
    } catch { toast({ title: "Failed to remove", variant: "destructive" }); }
  };

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Expenses</h1>
            <p className="text-muted-foreground text-sm">₵ {monthTotal.toFixed(2)} spent this month</p>
          </div>
          <Button variant="accent" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No expenses logged yet</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 capitalize text-muted-foreground">{e.category}</td>
                  <td className="p-3 font-semibold">₵ {e.amount.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Fuel for delivery" />
            </div>
            <div className="space-y-1">
              <Label>Amount (₵) *</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={createExpense.isPending}>
              {createExpense.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Expense?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteExpense.isPending}>
              {deleteExpense.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
