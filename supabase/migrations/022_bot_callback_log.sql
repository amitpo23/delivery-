-- =============================================
-- Migration 022: Bot callback log (Driver Bot interactive)
-- =============================================
-- Records every Telegram callback_query the driver-bot processes. Two
-- jobs:
--   1. Idempotency. Telegram retries the same update on transient
--      network blips; PRIMARY KEY on callback_id makes the second try
--      a duplicate-key error we silently swallow.
--   2. Audit. If a driver disputes "I never tapped delivered", we have
--      a row with chat_id, order_id, raw payload and the outcome.
--
-- Action vocabulary (must match src/lib/bot/callback.ts):
--   pickup   -> assigned   -> picked_up
--   transit  -> picked_up  -> in_transit
--   deliver  -> in_transit -> delivered
--   return   -> in_transit -> returned
--   issue    -> opens an admin ticket (no status change)

CREATE TABLE bot_callback_log (
  callback_id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp')),
  chat_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processed', 'rejected', 'error')),
  reason TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_callback_log_order ON bot_callback_log(order_id, created_at DESC);
CREATE INDEX idx_bot_callback_log_chat ON bot_callback_log(chat_id, created_at DESC);

ALTER TABLE bot_callback_log ENABLE ROW LEVEL SECURITY;

-- Only admins read this table directly. Drivers don't need to query their own
-- callbacks — the actions are reflected in orders.status and the timeline.
CREATE POLICY "Admins read bot_callback_log"
  ON bot_callback_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
