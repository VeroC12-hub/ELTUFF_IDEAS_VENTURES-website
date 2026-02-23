import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type OrderItem = Tables<"order_items"> & {
  products?: { name: string; unit: string } | null;
};

export type Order = Tables<"orders"> & {
  order_items?: OrderItem[];
  profiles?: { full_name: string; email: string; company_name: string | null } | null;
};

// ─── Client: own orders ────────────────────────────────────────────────────────
export const useMyOrders = () =>
  useQuery({
    queryKey: ["orders", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, unit))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

// ─── Staff: all orders ─────────────────────────────────────────────────────────
export const useAllOrders = () =>
  useQuery({
    queryKey: ["orders", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, unit))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Attach profile info for each order
      const withProfiles = await Promise.all(
        (data ?? []).map(async (order) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, company_name")
            .eq("user_id", order.user_id)
            .single();
          return { ...order, profiles: profile };
        })
      );
      return withProfiles as Order[];
    },
  });

// ─── Create order with items ───────────────────────────────────────────────────
export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      items,
      shippingAddress,
      notes,
    }: {
      userId: string;
      items: { product_id: string; quantity: number; unit_price: number }[];
      shippingAddress?: string;
      notes?: string;
    }) => {
      const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          total_amount: total,
          shipping_address: shippingAddress ?? "",
          notes: notes ?? "",
          status: "pending",
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) throw itemsErr;

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// ─── Update order status ───────────────────────────────────────────────────────
export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};
