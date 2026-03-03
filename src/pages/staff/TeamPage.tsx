import { useState, useMemo, startTransition } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember, useDeleteStaffMember } from "@/hooks/useStaffMembers";
import { format } from "date-fns";
import {
  LayoutDashboard, Users, Package, PackageOpen, Receipt,
  BarChart3, Settings, ShoppingCart, UserPlus,
  Warehouse, CreditCard, ClipboardList, FlaskConical, BookOpen,
  Calculator, Plus, Pencil, Trash2, Loader2, Phone, Mail, BookMarked,
} from "lucide-react";

import navGroups from "@/lib/staffNavGroups";

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  position: "",
  department: "",
  basic_salary: "",
  hire_date: "",
  notes: "",
};

const initials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

export default function TeamPage() {
  const { data: staff = [], isLoading } = useStaffMembers();
  const createStaff  = useCreateStaffMember();
  const updateStaff  = useUpdateStaffMember();
  const deleteStaff  = useDeleteStaffMember();
  const { toast }    = useToast();

  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const openCreate = () => startTransition(() => { setForm(emptyForm); setEditId(null); setOpen(true); });
  const openEdit   = (s: any) => startTransition(() => {
    setForm({
      full_name:    s.full_name,
      phone:        s.phone,
      email:        s.email ?? "",
      position:     s.position ?? "",
      department:   s.department ?? "",
      basic_salary: String(s.basic_salary ?? ""),
      hire_date:    s.hire_date ?? "",
      notes:        s.notes ?? "",
    });
    setEditId(s.id);
    setOpen(true);
  });

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast({ title: "Full name and phone number are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name:    form.full_name.trim(),
        phone:        form.phone.trim(),
        email:        form.email.trim() || null,
        position:     form.position.trim() || null,
        department:   form.department.trim() || null,
        basic_salary: parseFloat(form.basic_salary) || 0,
        hire_date:    form.hire_date || null,
        notes:        form.notes.trim() || null,
      };
      if (editId) await updateStaff.mutateAsync({ id: editId, ...payload });
      else await createStaff.mutateAsync(payload);
      toast({ title: editId ? "Staff member updated" : "Staff member added" });
      setOpen(false);
    } catch { toast({ title: "Error saving staff member", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member? They will be marked inactive.")) return;
    await deleteStaff.mutateAsync(id);
    toast({ title: "Staff member removed" });
    if (selected?.id === id) setSelected(null);
  };

  const filtered = useMemo(() =>
    staff.filter(s =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").includes(search) ||
      (s.position ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.department ?? "").toLowerCase().includes(search.toLowerCase())
    ), [staff, search]);

  const active   = staff.filter(s => s.is_active).length;
  const inactive = staff.filter(s => !s.is_active).length;
  const totalSalary = staff.filter(s => s.is_active).reduce((sum, s) => sum + (s.basic_salary ?? 0), 0);

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Team</h1>
            <p className="text-muted-foreground text-sm">{active} active staff member{active !== 1 ? "s" : ""}</p>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Staff Member
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Staff",      value: String(active),   color: "text-success" },
            { label: "Inactive",          value: String(inactive), color: "text-muted-foreground" },
            { label: "Monthly Salary Bill", value: `₵ ${totalSalary.toFixed(2)}`, color: "text-destructive" },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <Input
          placeholder="Search by name, phone, position or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Position</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Salary</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Hired</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 bg-secondary/50 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{search ? "No staff match your search" : "No staff members yet — add your first team member"}</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                          {initials(s.full_name)}
                        </div>
                        <button onClick={() => setSelected(s)} className="font-medium text-left hover:text-primary transition-colors">{s.full_name}</button>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{s.position ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{s.department ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{s.phone}</td>
                    <td className="p-3 text-muted-foreground text-xs">{s.email ?? "—"}</td>
                    <td className="p-3 text-right font-medium">₵ {(s.basic_salary ?? 0).toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground text-xs">{s.hire_date ? (() => { try { return format(new Date(s.hire_date), "MMM yyyy"); } catch { return s.hire_date; } })() : "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-success/10 text-success" : "bg-secondary text-secondary-foreground"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Staff Profile</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                  {initials(selected.full_name)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selected.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selected.position ?? "No position set"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Department</p>
                  <p className="font-medium text-sm">{selected.department ?? "—"}</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Basic Salary</p>
                  <p className="font-bold text-sm">₵ {(selected.basic_salary ?? 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{selected.phone}</span>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>{selected.email}</span>
                  </div>
                )}
              </div>
              {selected.notes && (
                <p className="text-xs text-muted-foreground border-t border-border pt-3">{selected.notes}</p>
              )}
              {selected.hire_date && (
                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  Hired: {(() => { try { return format(new Date(selected.hire_date), "MMMM d, yyyy"); } catch { return selected.hire_date; } })()}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelected(null); openEdit(selected); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Phone is required. Email is optional.</p>
            {[
              { label: "Full Name *",    key: "full_name",    type: "text",   placeholder: "Full name" },
              { label: "Phone *",        key: "phone",        type: "tel",    placeholder: "e.g. 0244000000" },
              { label: "Email (optional)", key: "email",     type: "email",  placeholder: "Optional" },
              { label: "Position",       key: "position",     type: "text",   placeholder: "e.g. Supervisor, Driver, Sales" },
              { label: "Department",     key: "department",   type: "text",   placeholder: "e.g. Production, Admin, Sales" },
              { label: "Basic Salary (GHS)", key: "basic_salary", type: "number", placeholder: "0.00" },
              { label: "Hire Date",      key: "hire_date",    type: "date",   placeholder: "" },
              { label: "Notes",          key: "notes",        type: "text",   placeholder: "Optional notes" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  className="mt-1 h-9"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
