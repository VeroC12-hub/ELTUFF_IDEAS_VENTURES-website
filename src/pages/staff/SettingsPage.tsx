import { useState, useEffect } from "react";

// ── Company settings helpers ──────────────────────────────────────────────────
const COMPANY_KEY   = "eltuff_company_settings";
const DEFAULTS_KEY  = "eltuff_business_defaults";

interface CompanySettings {
  name:     string;
  tagline:  string;
  email:    string;
  phone:    string;
  address:  string;
  website:  string;
  logo_url: string;
}

const defaultCompany: CompanySettings = {
  name:     "Eltuff Ideas Ventures",
  tagline:  "Ani's Pride Hair & Skin Products",
  email:    "anisprideglobal@gmail.com",
  phone:    "055 326 4442  |  055 534 4377",
  address:  "Ayebeng Ave, Adenta, Accra — Ghana",
  website:  "",
  logo_url: "",
};

function loadCompany(): CompanySettings {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    return raw ? { ...defaultCompany, ...JSON.parse(raw) } : defaultCompany;
  } catch { return defaultCompany; }
}
function saveCompany(data: CompanySettings) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(data));
}

// ── Business defaults helpers ─────────────────────────────────────────────────
interface BusinessDefaults {
  currency_symbol:   string;
  currency_code:     string;
  default_tax_pct:   number;
  invoice_due_days:  number;
  payment_terms:     string;
  low_stock_alert:   number;
  order_prefix:      string;
  invoice_prefix:    string;
  // Production cost overheads (% of base material+overhead cost)
  vat_pct:           number;
  nhil_pct:          number;
  getfund_pct:       number;
  utilities_pct:     number;
  labour_pct:        number;
  packaging_pct:     number;
  equipment_dep_pct: number;
}

const defaultBusiness: BusinessDefaults = {
  currency_symbol:  "₵",
  currency_code:    "GHS",
  default_tax_pct:  15,
  invoice_due_days: 30,
  payment_terms:    "Payment due within 30 days of invoice date.",
  low_stock_alert:  10,
  order_prefix:     "ORD",
  invoice_prefix:   "INV",
  // Cosmetics / personal-care industry defaults for Ghana
  vat_pct:           15,   // Ghana standard VAT
  nhil_pct:          2.5,  // National Health Insurance Levy
  getfund_pct:       2.5,  // GETFUND Levy
  utilities_pct:     4,    // Electricity, water, gas
  labour_pct:        22,   // Direct labour cost
  packaging_pct:     12,   // Bottles, labels, cartons
  equipment_dep_pct: 3,    // Equipment depreciation
};

function loadDefaults(): BusinessDefaults {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? { ...defaultBusiness, ...JSON.parse(raw) } : defaultBusiness;
  } catch { return defaultBusiness; }
}
function saveDefaults(data: BusinessDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(data));
}

// Export so other pages (invoices, orders) can read these
export { loadDefaults, loadCompany };
export type { BusinessDefaults, CompanySettings };
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Package, Receipt, BarChart3,
  Settings, ShoppingCart, UserPlus, Warehouse, CreditCard,
  ClipboardList, User, Building2, SlidersHorizontal, KeyRound,
  Save, Loader2,
  FlaskConical, BookOpen, Calculator } from "lucide-react";

// ── Nav ───────────────────────────────────────────────────────────────────────
const navGroups = [
  { label: "Overview",   items: [{ title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard }] },
  { label: "Sales",      items: [{ title: "Quotes", url: "/staff/quotes", icon: ClipboardList }, { title: "Invoices", url: "/staff/invoices", icon: Receipt }, { title: "Orders", url: "/staff/orders", icon: ShoppingCart }] },
  { label: "Management", items: [{ title: "Clients", url: "/staff/clients", icon: Users }, { title: "Inventory", url: "/staff/inventory", icon: Warehouse }, { title: "Products", url: "/staff/products", icon: Package }] },
  { label: "Production",  items: [{ title: "Materials",  url: "/staff/production/materials",  icon: FlaskConical }, { title: "Recipes", url: "/staff/production/recipes", icon: BookOpen }, { title: "Calculator", url: "/staff/production/calculator", icon: Calculator }] },
  { label: "Finance",    items: [{ title: "Accounts", url: "/staff/accounts", icon: CreditCard }, { title: "Reports", url: "/staff/reports", icon: BarChart3 }] },
  { label: "System",     items: [{ title: "Team", url: "/staff/team", icon: UserPlus }, { title: "Settings", url: "/staff/settings", icon: Settings }] },
];

type Tab = "profile" | "company" | "defaults" | "password";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",  label: "Personal Profile", icon: User           },
  { id: "company",  label: "Company",          icon: Building2      },
  { id: "defaults", label: "Business Defaults",icon: SlidersHorizontal },
  { id: "password", label: "Password",         icon: KeyRound       },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function StaffSettingsPage() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Personal Profile state ─────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    full_name:    profile?.full_name    ?? "",
    phone:        profile?.phone        ?? "",
    company_name: profile?.company_name ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Company Settings state ─────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState<CompanySettings>(loadCompany);
  const [companySaved, setCompanySaved] = useState(false);

  const saveCompanySettings = () => {
    saveCompany(companyForm);
    setCompanySaved(true);
    toast({ title: "Company settings saved", description: "Changes stored successfully." });
    setTimeout(() => setCompanySaved(false), 2000);
  };

  // ── Business Defaults state ────────────────────────────────────────────────
  const [defaultsForm, setDefaultsForm] = useState<BusinessDefaults>(loadDefaults);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const setDef = <K extends keyof BusinessDefaults>(key: K, val: BusinessDefaults[K]) =>
    setDefaultsForm(prev => ({ ...prev, [key]: val }));

  const saveBusinessDefaults = () => {
    saveDefaults(defaultsForm);
    setDefaultsSaved(true);
    toast({ title: "Business defaults saved", description: "Defaults applied to new invoices and orders." });
    setTimeout(() => setDefaultsSaved(false), 2000);
  };

  // ── Password state ─────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError,  setPwError]    = useState<string | null>(null);
  const [pwStrength, setPwStrength] = useState(0);

  // Simple strength meter: length + variety
  useEffect(() => {
    const p = pwForm.next;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    setPwStrength(score);
  }, [pwForm.next]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][pwStrength] ?? "";
  const strengthColor = ["", "bg-destructive", "bg-warning", "bg-warning", "bg-success", "bg-success"][pwStrength] ?? "";

  const changePassword = async () => {
    setPwError(null);
    if (!pwForm.next) return setPwError("New password is required.");
    if (pwForm.next.length < 8) return setPwError("Password must be at least 8 characters.");
    if (pwForm.next !== pwForm.confirm) return setPwError("Passwords do not match.");
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setPwSaving(false);
    if (error) {
      setPwError(error.message);
    } else {
      setPwForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:    profileForm.full_name.trim(),
        phone:        profileForm.phone.trim(),
        company_name: profileForm.company_name.trim(),
      })
      .eq("user_id", user.id);
    setProfileSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    }
  };

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your profile and system preferences
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/60 rounded-lg p-1 w-fit flex-wrap">
          {TABS.map(t => {
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

        {/* ── Company Settings tab ────────────────────────────────────────── */}
        {activeTab === "company" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg space-y-5">
            <div>
              <h2 className="font-display font-semibold">Company Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Appears on invoices, quotes, and outgoing communications
              </p>
            </div>

            {/* Logo preview */}
            {companyForm.logo_url && (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <img
                  src={companyForm.logo_url}
                  alt="Company logo"
                  className="h-10 w-10 rounded object-contain"
                  onError={e => (e.currentTarget.style.display = "none")}
                />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}

            <div className="space-y-4">
              {[
                { key: "name",     label: "Company Name",   placeholder: "Eltuff Ideas Ventures" },
                { key: "tagline",  label: "Tagline",        placeholder: "Your business tagline" },
                { key: "email",    label: "Business Email", placeholder: "info@eltuff.com" },
                { key: "phone",    label: "Business Phone", placeholder: "+233 00 000 0000" },
                { key: "website",  label: "Website",        placeholder: "https://eltuff.com" },
                { key: "logo_url", label: "Logo URL",       placeholder: "https://..." },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={companyForm[field.key as keyof CompanySettings]}
                    onChange={e =>
                      setCompanyForm(prev => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Address</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={companyForm.address}
                  onChange={e => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street, City, Region, Ghana"
                />
              </div>
            </div>

            <button
              onClick={saveCompanySettings}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Save className="h-4 w-4" />
              {companySaved ? "Saved!" : "Save Company Settings"}
            </button>
          </div>
        )}

        {/* ── Business Defaults tab ───────────────────────────────────────── */}
        {activeTab === "defaults" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg space-y-6">
            <div>
              <h2 className="font-display font-semibold">Business Defaults</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pre-filled values used when creating new invoices and orders
              </p>
            </div>

            {/* Currency */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Currency</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Symbol</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={defaultsForm.currency_symbol}
                    onChange={e => setDef("currency_symbol", e.target.value)}
                    placeholder="₵"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Code</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={defaultsForm.currency_code}
                    onChange={e => setDef("currency_code", e.target.value)}
                    placeholder="GHS"
                  />
                </div>
              </div>
            </div>

            {/* Tax & Invoicing */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tax & Invoicing</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0} max={100} step={0.5}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={defaultsForm.default_tax_pct}
                    onChange={e => setDef("default_tax_pct", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Invoice Due (days)</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={defaultsForm.invoice_due_days}
                    onChange={e => setDef("invoice_due_days", parseInt(e.target.value))}
                  >
                    {[7, 14, 21, 30, 45, 60, 90].map(d => (
                      <option key={d} value={d}>Net {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Terms (appears on invoices)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  value={defaultsForm.payment_terms}
                  onChange={e => setDef("payment_terms", e.target.value)}
                />
              </div>
            </div>

            {/* Number prefixes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Number Prefixes</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Order Prefix</label>
                  <div className="flex items-center gap-1">
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={defaultsForm.order_prefix}
                      onChange={e => setDef("order_prefix", e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="ORD"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    e.g. {defaultsForm.order_prefix}-2026-0001
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Invoice Prefix</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={defaultsForm.invoice_prefix}
                    onChange={e => setDef("invoice_prefix", e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="INV"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. {defaultsForm.invoice_prefix}-2026-0001
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory alert threshold */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Inventory</h3>
              <div className="space-y-1.5 max-w-[200px]">
                <label className="text-sm font-medium">Low Stock Alert Threshold (units)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={defaultsForm.low_stock_alert}
                  onChange={e => setDef("low_stock_alert", parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls at or below this quantity
                </p>
              </div>
            </div>

            {/* Production Taxes & Overheads */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Production Taxes & Overheads
                </h3>
                <button
                  onClick={() => setDefaultsForm(prev => ({
                    ...prev,
                    vat_pct: 15, nhil_pct: 2.5, getfund_pct: 2.5,
                    utilities_pct: 4, labour_pct: 22, packaging_pct: 12, equipment_dep_pct: 3,
                  }))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Reset to industry defaults
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used in the Production Calculator. Based on cosmetics / personal-care industry averages in Ghana.
              </p>

              {/* Statutory taxes */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Statutory Taxes (applied to selling price)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "vat_pct",      label: "VAT",      hint: "Std: 15%"  },
                    { key: "nhil_pct",     label: "NHIL",     hint: "Std: 2.5%" },
                    { key: "getfund_pct",  label: "GETFUND",  hint: "Std: 2.5%" },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs font-medium">{f.label} %</label>
                      <input
                        type="number" min={0} max={100} step={0.1}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={defaultsForm[f.key as keyof BusinessDefaults] as number}
                        onChange={e => setDef(f.key as keyof BusinessDefaults, parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">{f.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Production overheads */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Production Overheads (% of base production cost)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "utilities_pct",     label: "Utilities",           hint: "Industry avg: 3–5%"   },
                    { key: "labour_pct",         label: "Direct Labour",       hint: "Industry avg: 20–25%" },
                    { key: "packaging_pct",      label: "Packaging",           hint: "Industry avg: 10–15%" },
                    { key: "equipment_dep_pct",  label: "Equipment Deprec.",   hint: "Industry avg: 2–5%"   },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-xs font-medium">{f.label} %</label>
                      <input
                        type="number" min={0} max={100} step={0.1}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={defaultsForm[f.key as keyof BusinessDefaults] as number}
                        onChange={e => setDef(f.key as keyof BusinessDefaults, parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">{f.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live total */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">Total overhead load on production cost</p>
                <p className="text-muted-foreground">
                  {(defaultsForm.utilities_pct + defaultsForm.labour_pct + defaultsForm.packaging_pct + defaultsForm.equipment_dep_pct).toFixed(1)}%
                  overhead + {(defaultsForm.vat_pct + defaultsForm.nhil_pct + defaultsForm.getfund_pct).toFixed(1)}% tax on selling price
                </p>
              </div>
            </div>

            {/* Preview card */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-sm mb-2">Preview</p>
              <p>Currency: <span className="text-foreground font-medium">{defaultsForm.currency_symbol} ({defaultsForm.currency_code})</span></p>
              <p>Tax: <span className="text-foreground font-medium">{defaultsForm.default_tax_pct}%</span></p>
              <p>Payment: <span className="text-foreground font-medium">Net {defaultsForm.invoice_due_days}</span></p>
              <p>Sample invoice: <span className="font-mono text-foreground">{defaultsForm.invoice_prefix}-2026-0001</span></p>
              <p>Sample order: <span className="font-mono text-foreground">{defaultsForm.order_prefix}-2026-0001</span></p>
            </div>

            <button
              onClick={saveBusinessDefaults}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Save className="h-4 w-4" />
              {defaultsSaved ? "Saved!" : "Save Defaults"}
            </button>
          </div>
        )}

        {/* ── Personal Profile tab ─────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg space-y-5">
            <div>
              <h2 className="font-display font-semibold">Personal Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your name and contact details visible to the team
              </p>
            </div>

            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl select-none">
                {(profileForm.full_name || profile?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{profile?.email}</p>
                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-primary/10 text-primary">
                  {role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <input
                  className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  value={profile?.email ?? ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+233 00 000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company / Department</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={profileForm.company_name}
                  onChange={e => setProfileForm(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="e.g. Eltuff Ideas Ventures"
                />
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
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="New password"
                  autoComplete="new-password"
                />
                {/* Strength bar */}
                {pwForm.next && (
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
                    pwForm.confirm && pwForm.confirm !== pwForm.next
                      ? "border-destructive"
                      : "border-border"
                  }`}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                {pwForm.confirm && pwForm.confirm !== pwForm.next && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            </div>

            {pwError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive">
                {pwError}
              </div>
            )}

            {/* Tips */}
            <div className="bg-muted/40 rounded-lg p-4 space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Strong password tips</p>
              <p className={pwForm.next.length >= 8  ? "text-success" : ""}>✓ At least 8 characters</p>
              <p className={/[A-Z]/.test(pwForm.next) ? "text-success" : ""}>✓ At least one uppercase letter</p>
              <p className={/[0-9]/.test(pwForm.next) ? "text-success" : ""}>✓ At least one number</p>
              <p className={/[^A-Za-z0-9]/.test(pwForm.next) ? "text-success" : ""}>✓ At least one special character</p>
            </div>

            <button
              onClick={changePassword}
              disabled={pwSaving || pwForm.next !== pwForm.confirm || !pwForm.next}
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
