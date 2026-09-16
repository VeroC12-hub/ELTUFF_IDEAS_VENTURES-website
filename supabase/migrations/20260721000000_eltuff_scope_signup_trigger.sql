-- Eltuff runs in the `eltuff` schema of a Supabase project whose auth pool is
-- shared with another app. Scope the auto-provisioning trigger to Eltuff signups
-- only (raw_user_meta_data.app = 'eltuff') so other apps' users never get Eltuff
-- profiles/roles. Also make it safe for phone logins (which use a synthetic
-- email, with the real phone carried in metadata) and honor a requested role.
CREATE OR REPLACE FUNCTION eltuff.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = eltuff
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') = 'eltuff' THEN
    INSERT INTO eltuff.profiles (user_id, full_name, email, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      CASE
        WHEN COALESCE(NEW.raw_user_meta_data->>'login_type', 'email') = 'phone'
        THEN ''
        ELSE COALESCE(NEW.email, '')
      END,
      COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO eltuff.user_roles (user_id, role)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', '')::eltuff.app_role, 'client')
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
