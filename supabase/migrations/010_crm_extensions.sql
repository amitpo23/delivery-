-- =============================================
-- Migration 010: CRM extensions
-- =============================================
-- Adds the data the customer-management UI needs without restructuring
-- the existing tables:
--   - customers.tags  — flexible labelling (VIP, late_payer, ...)
--   - customers.notes is already there from migration 001
--   - manual_messages — outbound messages an admin sent to a customer
--     through the bot adapters, separate from notification_log because
--     these are conversational, not delivery events
--
-- The conversation history shown in /admin/customers/[id] is a UNION of
-- bot_sessions data, manual_messages, and notification_log filtered by
-- the customer's phone — built in the API layer, not a stored view.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING gin (tags);

-- =============================================
-- manual_messages
-- =============================================
CREATE TABLE manual_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- recipient is the destination phone or chat_id at send time. We capture
  -- it independently so a customer record deletion still leaves an audit
  -- trail of what we sent and where.
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'sms', 'email')),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  external_id TEXT,
  failure_reason TEXT,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_manual_messages_customer ON manual_messages(customer_id, created_at DESC);
CREATE INDEX idx_manual_messages_recipient ON manual_messages(recipient, created_at DESC);

ALTER TABLE manual_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read manual_messages"
  ON manual_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
