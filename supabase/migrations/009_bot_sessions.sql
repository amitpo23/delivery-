-- =============================================
-- Migration 009: Bot conversation sessions
-- =============================================
-- The Telegram + WhatsApp bots collect order details over multi-message
-- conversations. We store each conversation's progress here keyed by
-- (channel, external_id) — phone number for WhatsApp, chat_id for Telegram.
--
-- Sessions auto-expire after 30 minutes of inactivity. The webhook handlers
-- treat an expired session as a fresh start, so a user who walks away mid-
-- order can come back and start over without state from a previous attempt
-- bleeding through.

CREATE TABLE bot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram')),
  external_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel, external_id)
);

CREATE INDEX idx_bot_sessions_expiry ON bot_sessions(expires_at);
CREATE INDEX idx_bot_sessions_lookup ON bot_sessions(channel, external_id);

CREATE TRIGGER update_bot_sessions_updated_at
  BEFORE UPDATE ON bot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: webhooks use service-role and bypass these policies. Admins can read
-- to debug stuck conversations; nothing else is exposed.
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bot_sessions"
  ON bot_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
