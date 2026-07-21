import { useState, useMemo, startTransition } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useUserLogins, useCreateLogin, type LoginRole, type LoginType,
} from "@/hooks/useUserLogins";
import { format } from "date-fns";
import { Plus, Loader2, KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import navGroups from "@/lib/staffNavGroups";

const emptyForm = {
  full_name: "",
  role: "client" as LoginRole,
  login_type: "phone" as LoginType,
  email: "",
  phone: "",
  password: "",
  company_name: "",
  client_tier: "retail",
};

const roleBadge = (role: LoginRole) => {
  const map: Record<LoginRole, string> = {
    admin: "bg-destructive/10 text-destructive",
    staff: "bg-primary/10 text-primary",
    client: "bg-success/10 text-success",
  };
  return map[role];
};

const initials = (name: string) =>
  (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

// A short readable random password suggestion.
const suggestPassword = () =>
  "Eltuff" + Math.floor(1000 + Math.random() * 9000);

export default function UserLoginsPage() {
  const { data: logins = [], isLoading } = useUserLogins();
  const createLogin = useCreateLogin();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () =>
    startTransition(() => {
      setForm({ ...emptyForm, password: suggestPassword() });
      setOpen(true);
    });

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    if (form.login_type === "email" && !form.email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (form.login_type === "phone" && form.phone.replace(/\D/g, "").length < 9) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await createLogin.mutateAsync({
        full_name: form.full_name.trim(),
        role: form.role,
        login_type: form.login_type,
        email: form.login_type === "email" ? form.email.trim() : undefined,
        phone: form.login_type === "phone" ? form.phone.trim() : undefined,
        password: form.password,
        company_name: form.company_name.trim() || undefined,
        client_tier: form.role === "client" ? form.client_tier : undefined,
      });
      toast({
        title: "Login created",
        description: `They sign in with "${res.login_hint}" and the password you set.`,
      });
      setOpen(false);
    } catch (e) {
      toast({
        title: "Could not create login",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      logins.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.full_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(search) ||
          l.role.includes(q)
        );
      }),
    [logins, search],
  );

  const counts = {
    total: logins.length,
    staff: logins.filter((l) => l.role === "staff" || l.role === "admin").length,
    clients: logins.filter((l) => l.role === "client").length,
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Login Accounts</h1>
            <p className="text-muted-foreground text-sm">
              Create portal logins for staff and clients — by email or phone, no verification email needed
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Login
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Logins", value: String(counts.total), color: "text-foreground" },
            { label: "Staff / Admin", value: String(counts.staff), color: "text-primary" },
            { label: "Clients", value: String(counts.clients), color: "text-success" },
          ].map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Accounts you create here are active immediately — the person signs in right away with the
            email or phone number and the password you set. Share the password with them securely.
          </span>
        </div>

        <Input
          placeholder="Search by name, email, phone or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Signs in with</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="p-3">
                          <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {search ? "No logins match your search" : "No logins yet — add your first one"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.user_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                            {initials(l.full_name)}
                          </div>
                          <span className="font-medium">{l.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {l.login_type === "phone" ? (
                            <Phone className="h-3.5 w-3.5" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          {l.login_type === "phone" ? l.phone : l.email}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadge(l.role)}`}>
                          {l.role}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground capitalize">
                        {l.role === "client" ? l.client_tier ?? "retail" : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {(() => {
                          try {
                            return format(new Date(l.created_at), "MMM d, yyyy");
                          } catch {
                            return l.created_at;
                          }
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Login Dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Add Login
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
              <Input
                className="mt-1 h-9"
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                <option value="client">Client</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Sign in with</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.login_type === "phone" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => set("login_type", "phone")}
                >
                  <Phone className="h-3.5 w-3.5 mr-1.5" /> Phone
                </Button>
                <Button
                  type="button"
                  variant={form.login_type === "email" ? "default" : "outline"}
                  className="h-9"
                  onClick={() => set("login_type", "email")}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" /> Email
                </Button>
              </div>
            </div>

            {form.login_type === "phone" ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone Number *</label>
                <Input
                  className="mt-1 h-9"
                  type="tel"
                  placeholder="e.g. 024 000 0000"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input
                  className="mt-1 h-9"
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Password *</label>
              <Input
                className="mt-1 h-9 font-mono"
                type="text"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Shown as text so you can copy and share it with the person.
              </p>
            </div>

            {form.role === "client" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company (optional)</label>
                  <Input
                    className="mt-1 h-9"
                    placeholder="Company name"
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pricing Tier</label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.client_tier}
                    onChange={(e) => set("client_tier", e.target.value)}
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Login
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
