import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ClientTier = "retail" | "wholesale" | "distributor";

export type ClientProfile = Tables<"profiles"> & {
  order_count?: number;
  total_spent?: number;
  source?: "auth" | "manual";
};

export type ManualClientProfile = Tables<"manual_clients"> & {
  order_count?: number;
  total_spent?: number;
  source?: "manual";
  // Map manual_clients fields to match ClientProfile shape
  user_id?: string;
  avatar_url?: string | null;
};

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      // 1. Auth-based clients
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");
      if (rolesErr) throw rolesErr;

      const userIds = (roles ?? []).map((r) => r.user_id);
      let authClients: ClientProfile[] = [];

      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", userIds)
          .order("created_at", { ascending: false });
        if (profErr) throw profErr;

        authClients = await Promise.all(
          (profiles ?? []).map(async (p) => {
            const { data: orders } = await supabase
              .from("orders")
              .select("total_amount")
              .eq("user_id", p.user_id);
            const order_count = orders?.length ?? 0;
            const total_spent = orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
            return { ...p, order_count, total_spent, source: "auth" as const };
          })
        );
      }

      // 2. Manual clients
      const { data: manualData } = await supabase
        .from("manual_clients")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const manualClients: ClientProfile[] = (manualData ?? []).map((m) => ({
        id:           m.id,
        user_id:      m.id,           // use own id as placeholder
        full_name:    m.full_name,
        email:        m.email ?? "",
        phone:        m.phone,
        company_name: m.company_name ?? null,
        address:      m.address ?? null,
        avatar_url:   null,
        client_tier:  m.client_tier,
        created_at:   m.created_at,
        updated_at:   m.updated_at,
        order_count:  0,
        total_spent:  0,
        source:       "manual" as const,
      } as any));

      return [...authClients, ...manualClients] as ClientProfile[];
    },
  });

export const useUpdateClientTier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: ClientTier }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ client_tier: tier } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};
