import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ClientProfile = Tables<"profiles"> & {
  order_count?: number;
  total_spent?: number;
};

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      // Get all client-role user IDs
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");
      if (rolesErr) throw rolesErr;

      const userIds = (roles ?? []).map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });
      if (profErr) throw profErr;

      // Attach order stats
      const withStats = await Promise.all(
        (profiles ?? []).map(async (p) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("user_id", p.user_id);
          const order_count = orders?.length ?? 0;
          const total_spent = orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
          return { ...p, order_count, total_spent };
        })
      );
      return withStats as ClientProfile[];
    },
  });
