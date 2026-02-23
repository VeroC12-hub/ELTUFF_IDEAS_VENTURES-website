import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, ShoppingBag, Receipt, BarChart3,
  Settings, User, KeyRound, Save, Loader2, MapPin, Phone, Building2,
} from "lucide-react";

// ── Nav ───────────────────────────────────────────────────────────────────────
const navGroups = [
  { label: "Overview",  items: [{ title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard }] },
  { label: "Orders",    items: [{ title: "My Orders", url: "/client/orders",    icon: ShoppingBag }, { title: "Invoices", url: "/client/invoices", icon: Receipt }] },
  { label: "Analytics", items: [{ title: "Reports",   url: "/client/reports",   icon: BarChart3 }, { title: "Settings", url: "/client/settings", icon: Settings }] },
];

type Tab = "profile" | "password";

export default function ClientSettingsPage() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Profile state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name:    profile?.full_name    ?? "",
    phone:        profile?.phone        ?? "",
    company_name: profile?.company_name ?? "",
    address:      "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Load address from profiles (fetch once)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, company_name, address")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setForm({
          full_name:    data.full_name    ?? "",
          phone:        data.phone        ?? "",
          company_name: data.company_name ?? "",
          address:      data.address      ?? "",
        });
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:    form.full_name.trim(),
        phone:        form.phone.trim(),
        company_name: form.company_name.trim(),
        address:      form.address.trim(),
      })
      .eq("user_id", user.id);
    setProfileSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved", description: "Your details have been updated." });
    }
  };

  // ── Password state ─────────────────────────────────────────────────────────
  const [pw, setPw]           = useState({ next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState<string | null>(null);
  const [pwStrength, setPwStrength] = useState(0);

  useEffect(() => {
    const p = pw.next;
    let s = 0;
    if (p.length >= 8)          s++;
    if (p.length >= 12)         s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    setPwStrength(s);
  }, [pw.next]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][pwStrength] ?? "";
  const strengthColor = ["", "bg-destructive", "bg-warning", "bg-warning", "bg-success", "bg-success"][pwStrength] ?? "";

  const changePassword = async () => {
    setPwError(null);
    if (!pw.next)           return setPwError("New password is required.");
    if (pw.next.length < 8) return setPwError("Password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return setPwError("Passwords do not match.");
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setPwSaving(false);
    if (error) {
      setPwError(error.message);
    } else {
      setPw({ next: "", confirm: "" });
      toast({ title: "Password updated", description: "Your password has been changed." });
    }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Client Portal">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Account Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile and security</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/60 rounded-lg p-1 w-fit">
          {([
            { id: "profile"  as Tab, label: "My Profile", icon: User    },
            { id: "password" as Tab, label: "Password",   icon: KeyRound },
          ]).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === t.id
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Profile tab ──────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg space-y-5">
            <div>
              <h2 className="font-display font-semibold">My Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your contact details used for orders and invoices
              </p>
            </div>

            {/* Avatar + role */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl select-none">
                {(form.full_name || profile?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{profile?.email}</p>
                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-amber-100 text-amber-700">
                  {role ?? "client"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Full name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Full Name
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              {/* Email — read only */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  value={profile?.email ?? ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Contact us to change your email</p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+233 00 000 0000"
                />
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Company / Business Name
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.company_name}
                  onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="Your business name (optional)"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Delivery Address
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street, City, Region, Ghana"
                />
                <p className="text-xs text-muted-foreground">Used as default shipping address on orders</p>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {profileSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />
              }
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}

        {/* ── Password tab ─────────────────────────────────────────────────── */}
        {activeTab === "password" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg space-y-5">
            <div>
              <h2 className="font-display font-semibold">Change Password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose a strong password — at least 8 characters
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={pw.next}
                  onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                  placeholder="New password"
                  autoComplete="new-password"
                />
                {pw.next && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div
                          key={n}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            n <= pwStrength ? strengthColor : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strengthLabel}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm New Password</label>
                <input
                  type="password"
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    pw.confirm && pw.confirm !== pw.next ? "border-destructive" : "border-border"
                  }`}
                  value={pw.confirm}
                  onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                {pw.confirm && pw.confirm !== pw.next && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            </div>

            {pwError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive">
                {pwError}
              </div>
            )}

            <div className="bg-muted/40 rounded-lg p-4 space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Requirements</p>
              <p className={pw.next.length >= 8          ? "text-success" : ""}>✓ At least 8 characters</p>
              <p className={/[A-Z]/.test(pw.next)        ? "text-success" : ""}>✓ One uppercase letter</p>
              <p className={/[0-9]/.test(pw.next)        ? "text-success" : ""}>✓ One number</p>
              <p className={/[^A-Za-z0-9]/.test(pw.next) ? "text-success" : ""}>✓ One special character</p>
            </div>

            <button
              onClick={changePassword}
              disabled={pwSaving || pw.next !== pw.confirm || !pw.next}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pwSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <KeyRound className="h-4 w-4" />
              }
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
