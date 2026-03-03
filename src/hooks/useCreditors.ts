import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Creditor = Tables<"creditors">;

export const useCreditors = () =>
  useQuery({
    queryKey: ["creditors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creditors")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Creditor[];
    },
  });

export const useCreateCreditor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      supplier_name: string;
      date?: string;
      description: string;
      amount_owed: number;
      amount_paid?: number;
      due_date?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("creditors").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditors"] }),
  });
};

export const useUpdateCreditor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Creditor> & { id: string }) => {
      const { error } = await supabase.from("creditors").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditors"] }),
  });
};

export const useDeleteCreditor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("creditors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditors"] }),
  });
};
