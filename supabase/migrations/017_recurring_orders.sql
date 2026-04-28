-- =============================================
-- Migration 017: Recurring orders
-- =============================================
-- A template that materializes into a fresh `orders` row every N days /
-- week-day. Useful for restaurants that ship to the same address every
-- weekday at 10:00, etc. The cron `/api/cron/run-recurring` reads
-- next_run_at <= now() and creates the next instance.

CREATE TABLE recurring_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Same booker fields as orders so we can reuse them on each run.
  booker_full_name TEXT NOT NULL,
  booker_phone TEXT NOT NULL,
  booker_email TEXT,
  -- Order template
  pickup_address TEXT NOT NULL,
  pickup_contact_name TEXT NOT NULL,
  pickup_contact_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_contact_name TEXT NOT NULL,
  delivery_contact_phone TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL')),
  urgency TEXT NOT NULL CHECK (urgency IN ('express', 'same_day', 'next_day', 'economy')),
  notes TEXT,
  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  -- For weekly/biweekly: 0=Sun..6=Sat. NULL when frequency=daily/monthly.
  weekday SMALLINT CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  -- Hour-of-day in 24h to materialize (UTC). Sane default 06:00.
  hour_of_day SMALLINT NOT NULL DEFAULT 6 CHECK (hour_of_day >= 0 AND hour_of_day < 24),
  next_run_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_due ON recurring_orders(next_run_at) WHERE active = true;

CREATE TRIGGER update_recurring_updated_at
  BEFORE UPDATE ON recurring_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Materialized run audit
CREATE TABLE recurring_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_id UUID NOT NULL REFERENCES recurring_orders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
  error_reason TEXT
);

CREATE INDEX idx_recurring_runs_recurring ON recurring_runs(recurring_id, ran_at DESC);

-- RLS — admin/dispatcher only
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recurring_orders"
  ON recurring_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins read recurring_runs"
  ON recurring_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
