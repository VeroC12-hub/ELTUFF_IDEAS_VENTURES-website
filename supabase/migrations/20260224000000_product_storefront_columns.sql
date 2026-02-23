-- Add storefront display columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS old_price NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storefront_section TEXT DEFAULT NULL
    CONSTRAINT products_storefront_section_check
    CHECK (storefront_section IN ('new_arrivals', 'best_sellers'));

-- Add display/ordering columns to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_storefront BOOLEAN NOT NULL DEFAULT true;

-- Hide Hair Care and Personal Care from storefront nav (company doesn't produce these)
UPDATE public.categories SET show_on_storefront = false WHERE name IN ('Hair Care', 'Personal Care');

-- Set sort order for storefront categories
UPDATE public.categories SET sort_order = 1 WHERE name = 'Cosmetics';
UPDATE public.categories SET sort_order = 2 WHERE name = 'Household Chemicals';
UPDATE public.categories SET sort_order = 3 WHERE name = 'Industrial';
UPDATE public.categories SET sort_order = 4 WHERE name = 'Hair Care';
UPDATE public.categories SET sort_order = 5 WHERE name = 'Personal Care';

-- Allow staff/admin to read all profiles (for client list)
-- (Policy already exists via "Staff/admin can view all profiles")

-- Staff/admin can view all orders for the order management page
-- (Policy already exists)

-- Add a cart table for persistent carts (optional, using localStorage in client)
-- We use localStorage on the client side, no server-side cart table needed.
