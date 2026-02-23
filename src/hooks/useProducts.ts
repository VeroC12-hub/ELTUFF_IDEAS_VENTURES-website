import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products"> & {
  categories?: { name: string } | null;
};
export type Category = Tables<"categories"> & { product_count?: number };

// ─── Storefront: categories visible on the homepage ───────────────────────────
export const useStorefrontCategories = () =>
  useQuery({
    queryKey: ["categories", "storefront"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("show_on_storefront", true)
        .order("sort_order");
      if (error) throw error;

      // Attach product counts
      const counts = await Promise.all(
        (data ?? []).map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .eq("is_active", true);
          return { ...cat, product_count: count ?? 0 };
        })
      );
      return counts as Category[];
    },
  });

// ─── Storefront: products by section ──────────────────────────────────────────
export const useStorefrontProducts = (section: "new_arrivals" | "best_sellers") =>
  useQuery({
    queryKey: ["products", "storefront", section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .eq("storefront_section", section)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

// ─── Single product (public) ──────────────────────────────────────────────────
export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });

// ─── Staff: all products ───────────────────────────────────────────────────────
export const useAllProducts = () =>
  useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

// ─── All categories (for selects) ─────────────────────────────────────────────
export const useAllCategories = () =>
  useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

// ─── CRUD mutations ────────────────────────────────────────────────────────────
export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: TablesInsert<"products">) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"products"> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

// ─── Category CRUD ─────────────────────────────────────────────────────────────
export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"categories"> & { id: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
