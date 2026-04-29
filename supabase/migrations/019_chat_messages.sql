-- =============================================
-- Migration 019: In-order chat (customer ↔ driver)
-- =============================================
-- A short conversation per active order. Customer writes from /track,
-- driver from the route view. Closes implicitly once the order is
-- delivered/cancelled — no schema lock; the UI just hides the input.

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- We don't FK to profiles for the customer side because anonymous
  -- bookings have no user_id. Sender is identified by role + name only.
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'driver', 'admin')),
  sender_name TEXT,
  body TEXT NOT NULL CHECK (length(body) <= 2000),
  read_by_recipient BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_order ON chat_messages(order_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Driver reads + writes for their own assigned orders.
CREATE POLICY "Drivers chat on own orders"
  ON chat_messages FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins chat on all orders"
  ON chat_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dispatcher'))
  );

-- Customer side flows through service-role API (anonymous bookings can't
-- authenticate), so no RLS for customers — the API enforces ownership
-- via booker_phone match.
