-- =============================================
-- Migration 011: Tickets / customer-service queue
-- =============================================
-- A ticket is the unit of work for a dispatcher / support agent: a
-- complaint, a stuck order, a refund request, a question. Tickets can be
-- created by hand or auto-created by /api/cron/check-stale-orders when an
-- order sits in `pending` for more than 24h.

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- For guest customers (no customers row) we still want a phone hook so
  -- the ticket links back to all of their orders via booker_phone.
  customer_phone TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto_pending', 'auto_late', 'customer_complaint')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status ON tickets(status, created_at DESC);
CREATE INDEX idx_tickets_customer ON tickets(customer_id, created_at DESC);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to, status) WHERE status IN ('open', 'in_progress');

-- Idempotency for auto-created tickets — a single (order_id, source)
-- pair can only have one ticket. Re-running the cron won't double-create.
CREATE UNIQUE INDEX idx_tickets_auto_dedup
  ON tickets(order_id, source)
  WHERE source IN ('auto_pending', 'auto_late') AND order_id IS NOT NULL;

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ticket_comments
-- =============================================
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  -- internal notes are dispatcher-only; customer-visible comments could
  -- one day get DM'd to the customer.
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);

-- =============================================
-- RLS — admin/dispatcher only for now
-- =============================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tickets"
  ON tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins manage ticket_comments"
  ON ticket_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
