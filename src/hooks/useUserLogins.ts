import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LoginRole = "client" | "staff" | "admin";
export type LoginType = "email" | "phone";

export interface UserLogin {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string | null;
  client_tier: string | null;
  role: LoginRole;
  login_type: LoginType;
  created_at: string;
}

export interface CreateLoginInput {
  full_name: string;
  role: LoginRole;
  login_type: LoginType;
  email?: string;
  phone?: string;
  password: string;
  company_name?: string;
  client_tier?: string;
}

const rolePriority: Record<string, number> = { admin: 3, staff: 2, client: 1 };

// List all Eltuff login accounts. Only Eltuff users have rows in eltuff.profiles
// (the signup trigger is scoped to app='eltuff'), so this never shows users of
// the other app sharing the auth pool. Requires admin (user_roles RLS).
export const useUserLogins = () =>
  useQuery({
    queryKey: ["user-logins"],
    queryFn: async (): Promise<UserLogin[]> => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, email, phone, company_name, client_tier, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id, role"),
        ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      const roleByUser = new Map<string, LoginRole>();
      for (const r of roles ?? []) {
        const existing = roleByUser.get(r.user_id);
        if (!existing || rolePriority[r.role] > rolePriority[existing]) {
          roleByUser.set(r.user_id, r.role as LoginRole);
        }
      }

      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email ?? "",
        phone: p.phone ?? "",
        company_name: p.company_name,
        client_tier: p.client_tier ?? null,
        role: roleByUser.get(p.user_id) ?? "client",
        login_type: p.email ? "email" : "phone",
        created_at: p.created_at,
      }));
    },
  });

export const useCreateLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLoginInput): Promise<{ login_hint: string }> => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: input,
      });
      if (error) {
        let msg = error.message;
        // FunctionsHttpError carries the server response; pull our JSON message.
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          } catch {
            /* keep default message */
          }
        }
        throw new Error(msg);
      }
      return data as { login_hint: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-logins"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};
