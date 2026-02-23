import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type RawMaterial      = Tables<"raw_materials">;
export type Recipe           = Tables<"recipes">;
export type RecipeIngredient = Tables<"recipe_ingredients"> & { raw_materials?: RawMaterial | null };
export type RecipeOverhead   = Tables<"recipe_overheads">;
export type PriceHistory     = Tables<"material_price_history">;

export type RecipeWithDetails = Recipe & {
  recipe_ingredients?: RecipeIngredient[];
  recipe_overheads?:   RecipeOverhead[];
  products?:           { name: string } | null;
};

// ── Raw Materials ─────────────────────────────────────────────────────────────
export const useRawMaterials = () =>
  useQuery({
    queryKey: ["raw_materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as RawMaterial[];
    },
  });

export const useCreateMaterial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<RawMaterial, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("raw_materials")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raw_materials"] }),
  });
};

export const useUpdateMaterial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<RawMaterial> & { id: string }) => {
      const { error } = await supabase
        .from("raw_materials")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raw_materials"] }),
  });
};

export const useDeleteMaterial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("raw_materials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raw_materials"] }),
  });
};

export const useMaterialPriceHistory = (materialId: string) =>
  useQuery({
    queryKey: ["material_price_history", materialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_price_history")
        .select("*")
        .eq("material_id", materialId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PriceHistory[];
    },
    enabled: !!materialId,
  });

// ── Recipes ───────────────────────────────────────────────────────────────────
export const useRecipes = () =>
  useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*, recipe_ingredients(*, raw_materials(*)), recipe_overheads(*), products(name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as RecipeWithDetails[];
    },
  });

export const useCreateRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipe,
      ingredients,
      overheads,
    }: {
      recipe:      Omit<Recipe, "id" | "created_at" | "updated_at" | "created_by">;
      ingredients: Omit<RecipeIngredient, "id" | "created_at" | "raw_materials">[];
      overheads:   Omit<RecipeOverhead, "id" | "created_at">[];
    }) => {
      const { data: rec, error: recErr } = await supabase
        .from("recipes")
        .insert(recipe)
        .select()
        .single();
      if (recErr) throw recErr;

      if (ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from("recipe_ingredients")
          .insert(ingredients.map(i => ({ ...i, recipe_id: rec.id })));
        if (ingErr) throw ingErr;
      }

      if (overheads.length > 0) {
        const { error: ohErr } = await supabase
          .from("recipe_overheads")
          .insert(overheads.map(o => ({ ...o, recipe_id: rec.id })));
        if (ohErr) throw ohErr;
      }

      return rec;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

export const useUpdateRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      recipe,
      ingredients,
      overheads,
    }: {
      id:          string;
      recipe:      Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>;
      ingredients: Omit<RecipeIngredient, "id" | "created_at" | "raw_materials">[];
      overheads:   Omit<RecipeOverhead, "id" | "created_at">[];
    }) => {
      const { error: recErr } = await supabase
        .from("recipes")
        .update(recipe)
        .eq("id", id);
      if (recErr) throw recErr;

      // Replace all ingredients and overheads
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
      await supabase.from("recipe_overheads").delete().eq("recipe_id", id);

      if (ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from("recipe_ingredients")
          .insert(ingredients.map(i => ({ ...i, recipe_id: id })));
        if (ingErr) throw ingErr;
      }

      if (overheads.length > 0) {
        const { error: ohErr } = await supabase
          .from("recipe_overheads")
          .insert(overheads.map(o => ({ ...o, recipe_id: id })));
        if (ohErr) throw ohErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};

export const useDeleteRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
};
