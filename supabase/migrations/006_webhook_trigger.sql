-- =============================================
-- Migration 006: pg_net webhook trigger for notification dispatch
-- =============================================
-- Codifies the AFTER INSERT/UPDATE trigger on `orders` that posts to the
-- Next.js /api/notifications/dispatch endpoint. The trigger was previously
-- created ad-hoc with raw SQL on the cloud DB; if the project is recreated
-- or migrated, the trigger would silently disappear and notifications
-- would stop firing. This migration makes it part of the schema.
--
-- URL and shared secret are loaded at runtime from Supabase Vault so they
-- can be rotated without re-deploying schema (and so they don't leak into
-- the migration). REQUIRED setup (run once per environment in SQL editor):
--
--   SELECT vault.create_secret(
--     'https://<your-domain>/api/notifications/dispatch',
--     'webhook_url'
--   );
--   SELECT vault.create_secret(
--     '<NOTIFICATIONS_WEBHOOK_SECRET from Vercel env>',
--     'webhook_secret'
--   );
--
-- If the secrets are absent, the function exits silently — useful for
-- local/test DBs that don't need to fire real webhooks.

-- =============================================
-- 1. Required extensions
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================
-- 2. Dispatcher function
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_orders_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'webhook_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'webhook_secret' LIMIT 1;

  -- No-op on environments that haven't configured the webhook yet.
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', v_secret
    ),
    body := jsonb_build_object(
      'type',   TG_OP,
      'table',  TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
    )
  );

  RETURN NEW;
END;
$$;

-- =============================================
-- 3. Trigger
-- =============================================
-- Fires on INSERT (new order) and on UPDATE OF status (state transitions).
-- Other column updates do NOT fire — the dispatcher routes by status, so
-- e.g. updating notes shouldn't ping it.
DROP TRIGGER IF EXISTS orders_dispatch_webhook ON public.orders;
CREATE TRIGGER orders_dispatch_webhook
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_orders_webhook();
