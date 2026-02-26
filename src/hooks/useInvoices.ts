import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type InvoiceItem = Tables<"invoice_items">;

export type Invoice = Tables<"invoices"> & {
  invoice_items?: InvoiceItem[];
  profiles?: { full_name: string; email: string; company_name: string | null; phone: string | null } | null;
  // Walk-in client billing (set when no user_id)
  billing_name?: string | null;
  billing_phone?: string | null;
  billing_address?: string | null;
};

// ─── Client: own invoices ──────────────────────────────────────────────────────
export const useMyInvoices = () =>
  useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

// ─── Staff: all invoices ───────────────────────────────────────────────────────
export const useAllInvoices = () =>
  useQuery({
    queryKey: ["invoices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const withProfiles = await Promise.all(
        (data ?? []).map(async (inv) => {
          if (!inv.user_id) return { ...inv, profiles: null };
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, company_name, phone")
            .eq("user_id", inv.user_id)
            .single();
          return { ...inv, profiles: profile };
        })
      );
      return withProfiles as Invoice[];
    },
  });

// ─── Create invoice ────────────────────────────────────────────────────────────
export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      orderId,
      items,
      dueDate,
      notes,
      taxPercent,
      billingName,
      billingPhone,
      billingAddress,
    }: {
      userId?: string;
      orderId?: string;
      items: { description: string; quantity: number; unit_price: number }[];
      dueDate?: string;
      notes?: string;
      taxPercent?: number;
      billingName?: string;
      billingPhone?: string;
      billingAddress?: string;
    }) => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const tax = subtotal * ((taxPercent ?? 0) / 100);
      const total = subtotal + tax;

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id: userId ?? null,
          order_id: orderId ?? null,
          amount: subtotal,
          tax_amount: tax,
          total_amount: total,
          due_date: dueDate ?? null,
          notes: notes ?? "",
          status: "draft",
          billing_name: billingName ?? null,
          billing_phone: billingPhone ?? null,
          billing_address: billingAddress ?? null,
        } as any)
        .select()
        .single();
      if (invErr) throw invErr;

      const invItems = items.map((i) => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));

      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(invItems);
      if (itemsErr) throw itemsErr;

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

// ─── Update invoice status ─────────────────────────────────────────────────────
export const useUpdateInvoiceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string | null> = { status };
      if (status === "paid") updates.paid_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};
