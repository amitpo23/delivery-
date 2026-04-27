-- =============================================
-- Migration 005: Notifications log + Telegram chat IDs
-- =============================================

-- =============================================
-- 1. Telegram chat IDs on profiles + drivers
-- =============================================
-- Drivers and admins onboard their Telegram bot; the chat_id is stored
-- here so the dispatcher can reach them. Anonymous customers do NOT have
-- one (they receive WhatsApp/SMS instead — see notifications channel
-- routing in src/lib/notifications).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE drivers  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- =============================================
-- 2. Notification log (audit + idempotency)
-- =============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,                -- e.g. "<order_id>:<status>"
  provider TEXT NOT NULL CHECK (provider IN ('telegram', 'whatsapp', 'sms', 'email')),
  recipient TEXT NOT NULL,                -- chat_id or phone or email
  template TEXT NOT NULL,                 -- semantic template key
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  external_id TEXT,                       -- provider message id
  failure_reason TEXT,
  attempts SMALLINT NOT NULL DEFAULT 0,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Idempotency: a single (event, provider, recipient) tuple is sent at most once.
-- A second webhook firing for the same logical event will fail this UNIQUE
-- and the dispatcher will mark it skipped without re-sending.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_idempotency
  ON notification_log (event_id, provider, recipient);

CREATE INDEX IF NOT EXISTS idx_notification_log_order
  ON notification_log (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_created
  ON notification_log (created_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read notification_log"
  ON notification_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
