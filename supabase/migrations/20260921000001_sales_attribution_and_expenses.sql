-- ── Attribute retail sales to the staff member who made them ────────────────
ALTER TABLE eltuff.invoices
  ADD COLUMN IF NOT EXISTS sold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_sold_by ON eltuff.invoices(sold_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON eltuff.invoices(created_at);

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eltuff.expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'other',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON eltuff.expenses
  FOR EACH ROW EXECUTE FUNCTION eltuff.update_updated_at_column();

ALTER TABLE eltuff.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_expenses" ON eltuff.expenses
  FOR ALL
  USING (eltuff.is_staff_or_admin())
  WITH CHECK (eltuff.is_staff_or_admin());
