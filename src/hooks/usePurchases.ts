import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { PaymentAccount } from "./useAccounts";

export type Purchase = Tables<"purchases"> & {
  payment_accounts?: Pick<PaymentAccount, "name" | "account_type"> | null;
};

export const usePurchases = () =>
  useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, payment_accounts(name, account_type)")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Purchase[];
    },
  });

export const useCreatePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      date?: string;
      supplier: string;
      item: string;
      quantity: number;
      unit?: string | null;
      unit_cost: number;
      account_id?: string | null;
      reference?: string | null;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("purchases").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
};

export const useUpdatePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Tables<"purchases">> & { id: string }) => {
      const { error } = await supabase.from("purchases").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
};

export const useDeletePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }),
  });
};
