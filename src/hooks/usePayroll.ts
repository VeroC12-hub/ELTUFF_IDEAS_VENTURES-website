import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { PaymentAccount } from "./useAccounts";

export type PayrollEntry = Tables<"payroll"> & {
  payment_accounts?: Pick<PaymentAccount, "name" | "account_type"> | null;
};

export const usePayroll = () =>
  useQuery({
    queryKey: ["payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select("*, payment_accounts(name, account_type)")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollEntry[];
    },
  });

export const useCreatePayrollEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      period_month: number;
      period_year: number;
      employee_name: string;
      staff_member_id?: string | null;
      basic_salary?: number;
      overtime?: number;
      deductions?: number;
      payment_date?: string | null;
      account_id?: string | null;
      notes?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payroll").insert({
        ...values,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
};

export const useUpdatePayrollEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Tables<"payroll">> & { id: string }) => {
      const { error } = await supabase.from("payroll").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
};

export const useDeletePayrollEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
};

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
