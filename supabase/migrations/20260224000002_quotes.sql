-- ── Quotes ────────────────────────────────────────────────────────────────────
CREATE TABLE public.quotes (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number  TEXT         UNIQUE NOT NULL
                             DEFAULT ('QTE-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 10000)::text, 4, '0')),
  client_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT         NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until   DATE,
  notes         TEXT         DEFAULT '',
  created_by    UUID         REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Quote Items ───────────────────────────────────────────────────────────────
CREATE TABLE public.quote_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     UUID          NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description  TEXT          NOT NULL DEFAULT '',
  quantity     NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Auto-update updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.quotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Staff / admin: full access
CREATE POLICY "Staff can manage quotes"
  ON public.quotes FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff can manage quote_items"
  ON public.quote_items FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

-- Clients: read their own quotes
CREATE POLICY "Clients read own quotes"
  ON public.quotes FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients read own quote_items"
  ON public.quote_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id AND q.client_id = auth.uid()
    )
  );
