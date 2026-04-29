-- =============================================
-- Migration 018: Web Push subscriptions
-- =============================================
-- One subscription per (browser, user). When the same browser re-subscribes
-- it gets the same endpoint URL — UNIQUE on endpoint dedupes those.
-- Anonymous-tracker subscriptions (a guest watching /track) tie themselves
-- to a phone number instead of a user_id, so the dispatcher can target
-- "ping every device tracking this phone".

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Phone bound subscriptions (anonymous /track watchers). Either user_id
  -- or phone is set; the API enforces it.
  phone TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_phone ON push_subscriptions(phone) WHERE phone IS NOT NULL;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Logged-in users manage their own subscriptions. Anonymous /track ones
-- flow through service-role (no auth.uid()) and bypass these policies.
CREATE POLICY "Users manage own push subs"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all push subs"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );
