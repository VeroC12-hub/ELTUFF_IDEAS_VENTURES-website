import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ManualClient = Tables<"manual_clients">;

export const useManualClients = () =>
  useQuery({
    queryKey: ["manual_clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_clients")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ManualClient[];
    },
  });

export const useCreateManualClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      full_name: string;
      phone: string;
      email?: string | null;
      company_name?: string | null;
      address?: string | null;
      client_tier?: string;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("manual_clients").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual_clients"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};

export const useUpdateManualClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ManualClient> & { id: string }) => {
      const { error } = await supabase.from("manual_clients").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual_clients"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};

export const useDeleteManualClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_clients").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual_clients"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};
