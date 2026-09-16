-- ── Link invoice_items back to the product sold (needed to restock on refund) ──
ALTER TABLE eltuff.invoice_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES eltuff.products(id) ON DELETE SET NULL;
