-- ============================================================
-- Accounting Books
-- Purchases (Buying Book), Creditors, Payroll, Production Batches
-- ============================================================

-- Purchases Book (Buying Book)
CREATE TABLE public.purchases (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  supplier    TEXT          NOT NULL,
  item        TEXT          NOT NULL,
  quantity    NUMERIC(12,3) NOT NULL,
  unit        TEXT,
  unit_cost   NUMERIC(12,2) NOT NULL,
  total_cost  NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  account_id  UUID          REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  reference   TEXT,
  notes       TEXT,
  created_by  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Creditors Book (Suppliers you owe money to)
CREATE TABLE public.creditors (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT          NOT NULL,
  date          DATE          NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT          NOT NULL,
  amount_owed   NUMERIC(12,2) NOT NULL,
  amount_paid   NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date      DATE,
  status        TEXT          NOT NULL DEFAULT 'unpaid'
                              CHECK (status IN ('unpaid','partial','paid')),
  notes         TEXT,
  created_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_creditors_updated_at
  BEFORE UPDATE ON public.creditors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payroll / Salary Book
CREATE TABLE public.payroll (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month    INT           NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INT           NOT NULL,
  employee_name   TEXT          NOT NULL,
  staff_member_id UUID          REFERENCES public.staff_members(id) ON DELETE SET NULL,
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime        NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay         NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + overtime - deductions) STORED,
  payment_date    DATE,
  account_id      UUID          REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  notes           TEXT,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Production Batch Book (Batch Record / Quality Control)
CREATE TABLE public.production_batches (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number       TEXT          NOT NULL,
  production_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  product_name       TEXT          NOT NULL,
  product_id         UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  recipe_id          UUID          REFERENCES public.recipes(id) ON DELETE SET NULL,
  quantity_produced  NUMERIC(12,3) NOT NULL,
  unit               TEXT,
  raw_materials_used JSONB,
  supervisor         TEXT,
  status             TEXT          NOT NULL DEFAULT 'completed'
                                   CHECK (status IN ('in_progress','completed','rejected')),
  notes              TEXT,
  created_by         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_production_batches_updated_at
  BEFORE UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for all new tables
ALTER TABLE public.purchases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_purchases"  ON public.purchases
  FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "staff_manage_creditors"  ON public.creditors
  FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "staff_manage_payroll"    ON public.payroll
  FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY "staff_manage_batches"    ON public.production_batches
  FOR ALL USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());
