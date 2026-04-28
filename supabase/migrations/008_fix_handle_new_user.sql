-- =============================================
-- Migration 008: Harden handle_new_user trigger
-- =============================================
-- The original trigger from 001 worked locally but Supabase Auth Admin API
-- (auth.admin.createUser) returned "Database error creating new user" when
-- creating an account from outside an auth.users session — handle_new_user
-- inherited the caller's schema search_path which didn't reach `profiles`.
--
-- Two fixes:
--   1. SET search_path = public so the INSERT always resolves to public.profiles.
--   2. EXCEPTION handler that logs a warning and continues, so a profile-row
--      hiccup doesn't tear down the auth.users insert (we'd rather have an
--      orphaned user we can backfill than a 500 to the API).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
