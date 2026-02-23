import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type PaymentAccount = Tables<"payment_accounts">;
export type Expense = Tables<"expenses"> & {
  payment_accounts?: Pick<PaymentAccount, "name" | "account_type"> | null;
};

// ── Payment Accounts ───────────────────────────────────────────────────────────
export const usePaymentAccounts = () =>
  useQuery({
    queryKey: ["payment_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as PaymentAccount[];
    },
  });

export const useCreatePaymentAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; account_type: string; balance?: number; notes?: string }) => {
      const { error } = await supabase.from("payment_accounts").insert(values);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_accounts"] }),
  });
};

export const useUpdateAccountBalance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { error } = await supabase.from("payment_accounts").update({ balance }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_accounts"] }),
  });
};

export const useDeletePaymentAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_accounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_accounts"] }),
  });
};

// ── Expenses ───────────────────────────────────────────────────────────────────
export const useExpenses = () =>
  useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, payment_accounts(name, account_type)")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      category: string;
      description: string;
      amount: number;
      account_id?: string | null;
      expense_date?: string;
      receipt_ref?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase.from("expenses").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
};
