-- Guarantee that Eltuff accounts never require email confirmation, at the DB
-- level (independent of the project-wide "Confirm email" auth setting, which is
-- shared with the other app). Scoped to app='eltuff' so no other app is affected.
CREATE OR REPLACE FUNCTION eltuff.autoconfirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = eltuff
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') = 'eltuff' THEN
    IF NEW.email_confirmed_at IS NULL THEN
      NEW.email_confirmed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_eltuff_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_eltuff_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION eltuff.autoconfirm_new_user();
