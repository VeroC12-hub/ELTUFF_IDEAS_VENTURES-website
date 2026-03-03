import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients, useUpdateClientTier, ClientProfile, ClientTier } from "@/hooks/useClients";
import { useCreateManualClient, useUpdateManualClient } from "@/hooks/useManualClients";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, MapPin, ShoppingCart, DollarSign, LayoutDashboard, Package, PackageOpen, Warehouse, Users, Receipt, ClipboardList, BarChart3, Settings, UserPlus, CreditCard, FlaskConical, BookOpen, Calculator, Plus, Loader2, BookMarked } from "lucide-react";
import { format } from "date-fns";
import { loadTierNames, saveTierNames } from "@/pages/staff/SettingsPage";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

const TIER_COLORS: Record<ClientTier, string> = {
  retail: "bg-blue-100 text-blue-700",
  wholesale: "bg-green-100 text-green-700",
  distributor: "bg-purple-100 text-purple-700",
};

import navGroups from "@/lib/staffNavGroups";

const emptyClientForm = { full_name: "", phone: "", email: "", company_name: "", address: "", client_tier: "retail", notes: "" };

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const updateTier = useUpdateClientTier();
  const createManual = useCreateManualClient();
  const updateManual = useUpdateManualClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientProfile | null>(null);
  const [tierNames, setTierNames] = useState(loadTierNames);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameForm, setRenameForm] = useState({ retail: "", wholesale: "", distributor: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyClientForm);
  const [addSaving, setAddSaving] = useState(false);

  const handleAddClient = async () => {
    if (!addForm.full_name.trim() || !addForm.phone.trim()) {
      toast({ title: "Full name and phone are required", variant: "destructive" }); return;
    }
    setAddSaving(true);
    try {
      await createManual.mutateAsync({
        full_name:    addForm.full_name.trim(),
        phone:        addForm.phone.trim(),
        email:        addForm.email.trim() || null,
        company_name: addForm.company_name.trim() || null,
        address:      addForm.address.trim() || null,
        client_tier:  addForm.client_tier,
        notes:        addForm.notes.trim() || null,
      });
      toast({ title: "Client added successfully" });
      setAddOpen(false);
      setAddForm(emptyClientForm);
    } catch { toast({ title: "Error adding client", variant: "destructive" }); }
    finally { setAddSaving(false); }
  };

  const openRename = () => {
    setRenameForm({ retail: tierNames.retail, wholesale: tierNames.wholesale, distributor: tierNames.distributor });
    setRenameOpen(true);
  };
  const saveRename = () => {
    saveTierNames(renameForm.retail, renameForm.wholesale, renameForm.distributor);
    setTierNames(loadTierNames());
    setRenameOpen(false);
    toast({ title: "Tier names updated" });
  };

  const TIER_LABELS: Record<ClientTier, string> = {
    retail:      tierNames.retail,
    wholesale:   tierNames.wholesale,
    distributor: tierNames.distributor,
  };

  const handleTierChange = (client: ClientProfile, tier: ClientTier) => {
    const isManual = (client as any).source === "manual";
    if (isManual) {
      updateManual.mutate({ id: client.id, client_tier: tier } as any, {
        onSuccess: () => {
          toast({ title: "Tier updated", description: `${client.full_name} → ${TIER_LABELS[tier]}` });
          if (selected?.id === client.id) setSelected({ ...selected, ...{ client_tier: tier } as any });
        },
        onError: () => toast({ title: "Failed to update tier", variant: "destructive" }),
      });
      return;
    }
    updateTier.mutate({ userId: client.user_id, tier }, {
      onSuccess: () => {
        toast({ title: "Tier updated", description: `${client.full_name || client.email} → ${TIER_LABELS[tier]}` });
        if (selected?.id === client.id) setSelected({ ...selected, ...{ client_tier: tier } as any });
      },
      onError: () => toast({ title: "Failed to update tier", variant: "destructive" }),
    });
  };

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout navGroups={navGroups} portalName="Staff Portal">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Clients</h1>
            <p className="text-muted-foreground text-sm">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { setAddForm(emptyClientForm); setAddOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
            <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs" onClick={openRename}>
              <Pencil className="h-3 w-3" /> Rename Tiers
            </Button>
          </div>
        </div>

        <Input
          placeholder="Search by name, email or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Details</th>
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
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {search ? "No clients match your search" : "No clients yet"}
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                          {initials(c.full_name || c.email)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{c.full_name || "—"}</p>
                            {(c as any).source === "manual" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">Manual</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{c.email || c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.company_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="p-3">
                      {(() => {
                        const tier = ((c as any).client_tier ?? "retail") as ClientTier;
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[tier]}`}>
                            {TIER_LABELS[tier]}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 font-medium">{c.order_count ?? 0}</td>
                    <td className="p-3 font-medium">₵ {(c.total_spent ?? 0).toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelected(c)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Client Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Client Profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 py-2">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                  {initials(selected.full_name || selected.email)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selected.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                </div>
              </div>

              {/* Pricing Tier */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium min-w-[90px]">Pricing Tier</span>
                <Select
                  value={((selected as any).client_tier ?? "retail") as ClientTier}
                  onValueChange={(v) => handleTierChange(selected, v as ClientTier)}
                >
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">{tierNames.retail}</SelectItem>
                    <SelectItem value="wholesale">{tierNames.wholesale}</SelectItem>
                    <SelectItem value="distributor">{tierNames.distributor}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-xs">Total Orders</span>
                  </div>
                  <p className="text-xl font-bold">{selected.order_count ?? 0}</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Total Spent</span>
                  </div>
                  <p className="text-xl font-bold">₵ {(selected.total_spent ?? 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {selected.company_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{selected.company_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{selected.email}</span>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{selected.phone}</span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{selected.address}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                Client since {format(new Date(selected.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Add Manual Client Dialog */}
      <Dialog open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Phone number is required. Email is optional — use this for clients who don't have email addresses.
            </p>
            {[
              { label: "Full Name *",       key: "full_name",    type: "text",  placeholder: "Client full name" },
              { label: "Phone *",           key: "phone",        type: "tel",   placeholder: "e.g. 0244000000" },
              { label: "Email (optional)",  key: "email",        type: "email", placeholder: "Optional" },
              { label: "Company Name",      key: "company_name", type: "text",  placeholder: "Optional" },
              { label: "Address",           key: "address",      type: "text",  placeholder: "Optional" },
              { label: "Notes",             key: "notes",        type: "text",  placeholder: "Optional notes" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <Input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(addForm as any)[f.key]}
                  onChange={e => setAddForm(v => ({ ...v, [f.key]: e.target.value }))}
                  className="mt-1 h-9"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pricing Tier</label>
              <Select value={addForm.client_tier} onValueChange={v => setAddForm(f => ({ ...f, client_tier: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{tierNames.retail}</SelectItem>
                  <SelectItem value="wholesale">{tierNames.wholesale}</SelectItem>
                  <SelectItem value="distributor">{tierNames.distributor}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleAddClient} disabled={addSaving}>
                {addSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add Client
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Tiers Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Client Tiers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Give your three pricing categories any names that suit your business.
            </p>
            {(["retail", "wholesale", "distributor"] as ClientTier[]).map((key, idx) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium">Tier {idx + 1} (was "{["Retail","Wholesale","Distributor"][idx]}")</label>
                <Input
                  className="h-9"
                  value={renameForm[key]}
                  onChange={e => setRenameForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={["Retail","Wholesale","Distributor"][idx]}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={saveRename}>Save Names</Button>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
