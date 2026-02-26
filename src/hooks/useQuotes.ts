import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type QuoteItem = Tables<"quote_items">;

export type Quote = Tables<"quotes"> & {
  quote_items?: QuoteItem[];
  profiles?: { full_name: string; email: string; company_name: string | null; phone: string | null } | null;
  billing_name?: string | null;
  billing_phone?: string | null;
  billing_address?: string | null;
};

// ─── All quotes (staff) ────────────────────────────────────────────────────────
export const useAllQuotes = () =>
  useQuery({
    queryKey: ["quotes", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, quote_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const withProfiles = await Promise.all(
        (data ?? []).map(async (q) => {
          if (!q.client_id) return { ...q, profiles: null };
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, company_name, phone")
            .eq("user_id", q.client_id)
            .single();
          return { ...q, profiles: profile };
        })
      );
      return withProfiles as Quote[];
    },
  });

// ─── Create quote ──────────────────────────────────────────────────────────────
export const useCreateQuote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      items,
      taxPercent,
      validUntil,
      notes,
      billingName,
      billingPhone,
      billingAddress,
    }: {
      clientId?: string;
      items: { description: string; quantity: number; unit_price: number }[];
      taxPercent?: number;
      validUntil?: string;
      notes?: string;
      billingName?: string;
      billingPhone?: string;
      billingAddress?: string;
    }) => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const taxPct   = taxPercent ?? 0;
      const tax      = subtotal * (taxPct / 100);
      const total    = subtotal + tax;

      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .insert({
          client_id:       clientId ?? null,
          subtotal,
          tax_pct:         taxPct,
          tax_amount:      tax,
          total_amount:    total,
          valid_until:     validUntil ?? null,
          notes:           notes ?? "",
          status:          "draft",
          billing_name:    billingName ?? null,
          billing_phone:   billingPhone ?? null,
          billing_address: billingAddress ?? null,
        } as any)
        .select()
        .single();
      if (qErr) throw qErr;

      const qItems = items.map((i) => ({
        quote_id:    quote.id,
        description: i.description,
        quantity:    i.quantity,
        unit_price:  i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));

      const { error: itemsErr } = await supabase.from("quote_items").insert(qItems);
      if (itemsErr) throw itemsErr;

      return quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

// ─── Update quote status ───────────────────────────────────────────────────────
export const useUpdateQuoteStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

// ─── Convert quote → invoice ───────────────────────────────────────────────────
export const useConvertQuoteToInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quote }: { quote: Quote }) => {
      if (!quote.client_id) throw new Error("Quote has no client assigned");

      // 1. Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          user_id:      quote.client_id,
          amount:       quote.subtotal,
          tax_amount:   quote.tax_amount,
          total_amount: quote.total_amount,
          notes:        quote.notes ?? "",
          status:       "draft",
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // 2. Copy quote items → invoice items
      const invItems = (quote.quote_items ?? []).map((qi) => ({
        invoice_id:  invoice.id,
        description: qi.description,
        quantity:    qi.quantity,
        unit_price:  qi.unit_price,
        total_price: qi.total_price,
      }));

      if (invItems.length > 0) {
        const { error: iErr } = await supabase.from("invoice_items").insert(invItems);
        if (iErr) throw iErr;
      }

      // 3. Mark quote as accepted
      await supabase.from("quotes").update({ status: "accepted" }).eq("id", quote.id);

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};
