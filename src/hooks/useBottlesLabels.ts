import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ItemType = "bottle" | "label" | "cap" | "pump" | "sachet" | "other";

export interface BottleLabel {
  id: string;
  name: string;
  item_type: ItemType;
  size?: string | null;
  material?: string | null;
  colour?: string | null;
  unit_cost: number;
  stock_qty: number;
  reorder_level: number;
  supplier?: string | null;
  image_url?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewBottleLabel = Omit<BottleLabel, "id" | "created_at" | "updated_at"> & { created_by?: string };

const TABLE = "bottles_labels" as any;

export const useBottlesLabels = () =>
  useQuery({
    queryKey: ["bottles_labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("item_type")
        .order("name");
      if (error) throw error;
      return (data ?? []) as BottleLabel[];
    },
  });

export const useCreateBottleLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: NewBottleLabel) => {
      const { data, error } = await supabase.from(TABLE).insert(item as any).select().single();
      if (error) throw error;
      return data as BottleLabel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bottles_labels"] }),
  });
};

export const useUpdateBottleLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BottleLabel> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data as BottleLabel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bottles_labels"] }),
  });
};

export const useDeleteBottleLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bottles_labels"] }),
  });
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  bottle: "Bottle",
  label:  "Label",
  cap:    "Cap",
  pump:   "Pump",
  sachet: "Sachet",
  other:  "Other",
};

export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  bottle: "bg-blue-100 text-blue-700",
  label:  "bg-green-100 text-green-700",
  cap:    "bg-orange-100 text-orange-700",
  pump:   "bg-purple-100 text-purple-700",
  sachet: "bg-yellow-100 text-yellow-700",
  other:  "bg-gray-100 text-gray-700",
};
