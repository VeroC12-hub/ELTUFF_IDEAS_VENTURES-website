import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type InventoryLog = Tables<"inventory_logs"> & {
  products?: { name: string; unit: string } | null;
};

// ─── Products with low stock info ──────────────────────────────────────────────
export const useInventoryProducts = () =>
  useQuery({
    queryKey: ["inventory", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("stock_quantity");
      if (error) throw error;
      return data ?? [];
    },
  });

// ─── Inventory log ─────────────────────────────────────────────────────────────
export const useInventoryLogs = (productId?: string) =>
  useQuery({
    queryKey: ["inventory", "logs", productId],
    queryFn: async () => {
      let query = supabase
        .from("inventory_logs")
        .select("*, products(name, unit)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (productId) query = query.eq("product_id", productId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InventoryLog[];
    },
  });

// ─── Adjust stock ──────────────────────────────────────────────────────────────
export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      changeAmount,
      currentStock,
      reason,
      operatedBy,
    }: {
      productId: string;
      changeAmount: number;
      currentStock: number;
      reason: string;
      operatedBy: string;
    }) => {
      const newQuantity = Math.max(0, currentStock + changeAmount);

      // Update product stock
      const { error: prodErr } = await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", productId);
      if (prodErr) throw prodErr;

      // Log the change
      const { error: logErr } = await supabase.from("inventory_logs").insert({
        product_id: productId,
        change_amount: changeAmount,
        previous_quantity: currentStock,
        new_quantity: newQuantity,
        reason,
        operated_by: operatedBy,
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
