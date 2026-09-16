-- ── Cost price on products (for margin tracking on retail/POS side) ─────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT NULL;
