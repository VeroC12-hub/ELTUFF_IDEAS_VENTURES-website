-- ============================================================
-- Production Cost System
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Raw materials / ingredients ──────────────────────────────────────────────
CREATE TABLE public.raw_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'kg',      -- kg, L, g, ml, pcs, etc.
  cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
  supplier      TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Recipes / Formulas ───────────────────────────────────────────────────────
CREATE TABLE public.recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  product_id  UUID REFERENCES public.products(id) ON DELETE SET NULL,
  batch_yield NUMERIC(12,4) NOT NULL DEFAULT 1,   -- units produced per batch
  yield_unit  TEXT NOT NULL DEFAULT 'bottles',    -- bottles, kg, L, pcs, etc.
  notes       TEXT DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Recipe ingredients ───────────────────────────────────────────────────────
CREATE TABLE public.recipe_ingredients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id          UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  material_id        UUID REFERENCES public.raw_materials(id) ON DELETE RESTRICT NOT NULL,
  quantity_per_batch NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Recipe overhead costs ────────────────────────────────────────────────────
-- e.g. Labor ₵50/batch, Packaging ₵20/batch, Utilities ₵10/batch
CREATE TABLE public.recipe_overheads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  label           TEXT NOT NULL,                 -- 'Labor', 'Packaging', 'Fuel', etc.
  cost_per_batch  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Material price history ───────────────────────────────────────────────────
-- Automatically logged whenever cost_per_unit changes
CREATE TABLE public.material_price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE NOT NULL,
  old_price   NUMERIC(12,4) NOT NULL,
  new_price   NUMERIC(12,4) NOT NULL,
  changed_by  UUID REFERENCES auth.users(id),
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── updated_at triggers ──────────────────────────────────────────────────────
CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Auto-log price changes ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_material_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit THEN
    INSERT INTO public.material_price_history
      (material_id, old_price, new_price, changed_by)
    VALUES
      (NEW.id, OLD.cost_per_unit, NEW.cost_per_unit, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_material_price_change
  AFTER UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.log_material_price_change();

-- ============ RLS ============================================================

ALTER TABLE public.raw_materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_overheads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;

-- raw_materials: staff/admin full access
CREATE POLICY "Staff can manage raw materials"
  ON public.raw_materials FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- recipes: staff/admin full access
CREATE POLICY "Staff can manage recipes"
  ON public.recipes FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- recipe_ingredients: staff/admin full access
CREATE POLICY "Staff can manage recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- recipe_overheads: staff/admin full access
CREATE POLICY "Staff can manage recipe overheads"
  ON public.recipe_overheads FOR ALL
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- price history: staff/admin read + insert (no delete/update)
CREATE POLICY "Staff can view price history"
  ON public.material_price_history FOR SELECT
  USING (public.is_staff_or_admin());

CREATE POLICY "Staff can insert price history"
  ON public.material_price_history FOR INSERT
  WITH CHECK (public.is_staff_or_admin());
