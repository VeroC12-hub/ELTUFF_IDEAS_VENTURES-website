-- ── Payment Accounts ──────────────────────────────────────────────────────────
CREATE TABLE public.payment_accounts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT         NOT NULL,
  account_type TEXT         NOT NULL DEFAULT 'cash'
                            CHECK (account_type IN ('cash','bank','mobile_money','card')),
  balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency     TEXT         NOT NULL DEFAULT 'GHS',
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  notes        TEXT         DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE public.expenses (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT         NOT NULL DEFAULT 'misc'
                            CHECK (category IN (
                              'materials','labour','utilities','rent',
                              'marketing','packaging','equipment','misc'
                            )),
  description  TEXT         NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  account_id   UUID         REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  expense_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  receipt_ref  TEXT         DEFAULT '',
  notes        TEXT         DEFAULT '',
  created_by   UUID         REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_payment_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_payment_accounts_updated_at
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_accounts_updated_at();

CREATE OR REPLACE FUNCTION public.update_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_expenses_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage payment_accounts"
  ON public.payment_accounts FOR ALL
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can manage expenses"
  ON public.expenses FOR ALL
  USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- ── Seed default accounts ──────────────────────────────────────────────────────
INSERT INTO public.payment_accounts (name, account_type, balance) VALUES
  ('Cash on Hand',   'cash',         0),
  ('Main Bank',      'bank',         0),
  ('MTN Mobile Money','mobile_money', 0);
