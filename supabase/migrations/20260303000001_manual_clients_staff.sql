-- ============================================================
-- Manual Clients & Staff Members
-- Allows adding clients (phone-only, no email required) and
-- staff members without requiring Supabase auth accounts.
-- ============================================================

-- Manual clients (old/existing clients with no system account)
CREATE TABLE public.manual_clients (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT         NOT NULL,
  phone         TEXT         NOT NULL,
  email         TEXT,
  company_name  TEXT,
  address       TEXT,
  client_tier   TEXT         NOT NULL DEFAULT 'retail'
                             CHECK (client_tier IN ('retail','wholesale','distributor')),
  notes         TEXT,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_manual_clients_updated_at
  BEFORE UPDATE ON public.manual_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Staff members (employees who may not have system login)
CREATE TABLE public.staff_members (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT         NOT NULL,
  phone         TEXT         NOT NULL,
  email         TEXT,
  position      TEXT,
  department    TEXT,
  basic_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
  hire_date     DATE,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  notes         TEXT,
  created_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.manual_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_manual_clients" ON public.manual_clients
  FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "staff_manage_staff_members" ON public.staff_members
  FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());
