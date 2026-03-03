import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ProductionBatch = Tables<"production_batches">;

export const useProductionBatches = () =>
  useQuery({
    queryKey: ["production_batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_batches")
        .select("*")
        .order("production_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionBatch[];
    },
  });

export const useCreateProductionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      batch_number: string;
      production_date?: string;
      product_name: string;
      product_id?: string | null;
      recipe_id?: string | null;
      quantity_produced: number;
      unit?: string | null;
      raw_materials_used?: object | null;
      supervisor?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("production_batches").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production_batches"] }),
  });
};

export const useUpdateProductionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ProductionBatch> & { id: string }) => {
      const { error } = await supabase.from("production_batches").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production_batches"] }),
  });
};

export const useDeleteProductionBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production_batches"] }),
  });
};

// Auto-generate batch number: BAT-YYYY-XXXX
export const generateBatchNumber = (): string => {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `BAT-${year}-${suffix}`;
};
