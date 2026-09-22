-- One-time: force-sign-out anisprideglobal@gmail.com (Elijah) everywhere,
-- so every device must log in fresh. Deletes the underlying refresh tokens
-- and sessions for that specific user only — no other account is touched.
DELETE FROM auth.refresh_tokens
  WHERE user_id = 'd70da72d-4cef-4f81-92df-928f2d63c691';

DELETE FROM auth.sessions
  WHERE user_id = 'd70da72d-4cef-4f81-92df-928f2d63c691';
