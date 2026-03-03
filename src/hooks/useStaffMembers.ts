import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type StaffMember = Tables<"staff_members">;

export const useStaffMembers = () =>
  useQuery({
    queryKey: ["staff_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });

export const useCreateStaffMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      full_name: string;
      phone: string;
      email?: string | null;
      position?: string | null;
      department?: string | null;
      basic_salary?: number;
      hire_date?: string | null;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("staff_members").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
};

export const useUpdateStaffMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<StaffMember> & { id: string }) => {
      const { error } = await supabase.from("staff_members").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
};

export const useDeleteStaffMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_members").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_members"] }),
  });
};
