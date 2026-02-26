-- ── Pricing tiers + size on products ──────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_retail      NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_wholesale   NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_distributor NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS size              TEXT          DEFAULT NULL;

-- ── Client tier on profiles ───────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_tier TEXT DEFAULT 'retail'
    CHECK (client_tier IN ('retail','wholesale','distributor'));

-- Populate price_retail from existing price field where available
UPDATE products
  SET price_retail = price
  WHERE price IS NOT NULL AND price_retail IS NULL;
