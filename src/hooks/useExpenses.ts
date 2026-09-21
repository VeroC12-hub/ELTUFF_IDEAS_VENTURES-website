import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORIES = [
  "rent", "utilities", "supplies", "transport", "salaries", "maintenance", "other",
] as const;

export const useExpenses = () =>
  useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses" as any)
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Expense[];
    },
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { expense_date: string; description: string; amount: number; category: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses" as any).insert({
        ...values,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
};
