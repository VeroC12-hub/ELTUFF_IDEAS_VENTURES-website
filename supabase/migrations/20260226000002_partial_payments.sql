-- ── Partial payments on invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partial_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','bank_transfer','mobile_money','card','other')),
  momo_network  TEXT DEFAULT NULL,         -- MTN / Vodafone / AirtelTigo
  collected_by  TEXT NOT NULL,             -- sales rep name
  received_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT DEFAULT NULL,         -- receipt / transaction ref
  notes         TEXT DEFAULT NULL,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add part_paid status to invoices (alongside existing statuses)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED;

-- RLS
ALTER TABLE partial_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_full_partial_payments"
  ON partial_payments FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Index for fast invoice lookup
CREATE INDEX IF NOT EXISTS idx_partial_payments_invoice ON partial_payments(invoice_id);
