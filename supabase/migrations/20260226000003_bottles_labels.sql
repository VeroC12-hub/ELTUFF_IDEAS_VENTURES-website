-- ── Bottles & Labels inventory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bottles_labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  item_type     TEXT NOT NULL DEFAULT 'bottle'
    CHECK (item_type IN ('bottle','label','cap','pump','sachet','other')),
  size          TEXT DEFAULT NULL,           -- e.g. 250ml, A4, 100x50mm
  material      TEXT DEFAULT NULL,           -- e.g. HDPE, glass, paper
  colour        TEXT DEFAULT NULL,
  unit_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_qty     NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,3) NOT NULL DEFAULT 0,
  supplier      TEXT DEFAULT NULL,
  image_url     TEXT DEFAULT NULL,
  notes         TEXT DEFAULT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_updated_at_bottles_labels
  BEFORE UPDATE ON bottles_labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bottles_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_full_bottles_labels"
  ON bottles_labels FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Seed a few defaults
INSERT INTO bottles_labels (name, item_type, size, unit_cost, stock_qty, reorder_level)
VALUES
  ('Clear PET Bottle', 'bottle', '250ml', 0.80, 0, 50),
  ('Amber Glass Bottle', 'bottle', '100ml', 1.50, 0, 30),
  ('White HDPE Bottle', 'bottle', '500ml', 1.10, 0, 40),
  ('Disc Cap', 'cap', '24mm', 0.15, 0, 100),
  ('Pump Dispenser', 'pump', '28mm', 0.60, 0, 50),
  ('Roll Label (glossy)', 'label', '100x70mm', 0.20, 0, 200)
ON CONFLICT DO NOTHING;
