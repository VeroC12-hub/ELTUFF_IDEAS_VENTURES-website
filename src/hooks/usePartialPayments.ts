import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "other";
export type MomoNetwork  = "MTN" | "Vodafone" | "AirtelTigo";

export interface PartialPayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  momo_network?: string | null;
  collected_by: string;
  received_at: string;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface NewPartialPayment {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  momo_network?: string | null;
  collected_by: string;
  received_at: string;
  reference?: string | null;
  notes?: string | null;
  created_by?: string;
}

export const usePartialPayments = (invoiceId: string | null) =>
  useQuery({
    queryKey: ["partial_payments", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partial_payments" as any)
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartialPayment[];
    },
  });

export const useAddPartialPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: NewPartialPayment) => {
      // 1. Insert the payment record
      const { data, error } = await supabase
        .from("partial_payments" as any)
        .insert(payment as any)
        .select()
        .single();
      if (error) throw error;

      // 2. Recalculate amount_paid on the invoice
      const { data: allPayments } = await supabase
        .from("partial_payments" as any)
        .select("amount")
        .eq("invoice_id", payment.invoice_id);

      const totalPaid = (allPayments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);

      // 3. Fetch invoice total to determine new status
      const { data: inv } = await supabase
        .from("invoices")
        .select("total_amount, status")
        .eq("id", payment.invoice_id)
        .single();

      const newStatus =
        inv && totalPaid >= inv.total_amount
          ? "paid"
          : inv?.status === "draft" || inv?.status === "sent" || inv?.status === "overdue"
          ? "sent"   // keep current, just update amount_paid
          : inv?.status ?? "sent";

      await supabase
        .from("invoices")
        .update({ amount_paid: totalPaid, status: newStatus } as any)
        .eq("id", payment.invoice_id);

      return data as PartialPayment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partial_payments", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

export const useDeletePartialPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase.from("partial_payments" as any).delete().eq("id", id);
      if (error) throw error;

      // Recalculate amount_paid
      const { data: allPayments } = await supabase
        .from("partial_payments" as any)
        .select("amount")
        .eq("invoice_id", invoiceId);
      const totalPaid = (allPayments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      await supabase.from("invoices").update({ amount_paid: totalPaid } as any).eq("id", invoiceId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partial_payments", vars.invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  card: "Card",
  other: "Other",
};
