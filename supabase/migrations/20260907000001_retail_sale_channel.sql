-- ── Retail vs wholesale channel + payment method on invoices ─────────────────
-- Lets the Retail Shop portal reliably filter/report its own sales,
-- separate from wholesale/B2B invoices created on the Production side.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'wholesale'
    CHECK (channel IN ('wholesale', 'retail')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
