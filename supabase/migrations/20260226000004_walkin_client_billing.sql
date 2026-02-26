-- ── Walk-in / manual client support on invoices & quotes ─────────────────────
-- Allow invoices to be created for non-registered (walk-in) clients

-- 1. Make user_id nullable (walk-in clients have no user account)
ALTER TABLE public.invoices ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add billing info columns for walk-in clients
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_name    TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone   TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 3. Same for quotes
ALTER TABLE public.quotes ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS billing_name    TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone   TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;
