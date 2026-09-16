import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useManualClients, useCreateManualClient, useUpdateManualClient, useDeleteManualClient, ManualClient } from "@/hooks/useManualClients";
import retailNavGroups from "@/lib/retailNavGroups";
import { Plus, Pencil, Trash2 } from "lucide-react";

type FormData = { full_name: string; phone: string; email: string; notes: string };
const empty: FormData = { full_name: "", phone: "", email: "", notes: "" };

export default function RetailCustomersPage() {
  const { toast } = useToast();
  const { data: clients = [], isLoading } = useManualClients();
  const createClient = useCreateManualClient();
  const updateClient = useUpdateManualClient();
  const deleteClient = useDeleteManualClient();

  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ManualClient | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [deleting, setDeleting] = useState<ManualClient | null>(null);

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(empty); setEditing(null); setDialog("create"); };
  const openEdit = (c: ManualClient) => {
    setEditing(c);
    setForm({ full_name: c.full_name, phone: c.phone, email: c.email ?? "", notes: c.notes ?? "" });
    setDialog("edit");
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" }); return;
    }
    try {
      if (dialog === "create") {
        await createClient.mutateAsync({ ...form, client_tier: "retail" });
        toast({ title: "Customer added" });
      } else if (editing) {
        await updateClient.mutateAsync({ id: editing.id, ...form });
        toast({ title: "Customer updated" });
      }
      setDialog(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteClient.mutateAsync(deleting.id);
      toast({ title: "Customer removed" });
      setDeleting(null);
    } catch { toast({ title: "Failed to remove", variant: "destructive" }); }
  };

  return (
    <DashboardLayout navGroups={retailNavGroups} portalName="Retail Shop">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm">{clients.length} walk-in customers on file</p>
          </div>
          <Button variant="accent" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
        </div>

        <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No customers yet</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{c.full_name}</td>
                  <td className="p-3 text-muted-foreground">{c.phone}</td>
                  <td className="p-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "create" ? "Add Customer" : "Edit Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave} disabled={createClient.isPending || updateClient.isPending}>
              {createClient.isPending || updateClient.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Customer?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove <strong>{deleting?.full_name}</strong> from your customer list?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteClient.isPending}>
              {deleteClient.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
