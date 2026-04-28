-- =============================================
-- Migration 016: Driver shifts
-- =============================================
-- Drivers explicitly start/end shifts. The "current shift" is the row
-- with ended_at IS NULL. End-of-shift writes ended_at and the duration.

CREATE TABLE driver_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  -- Cached duration so reports don't have to recompute on every read.
  total_minutes INTEGER,
  notes TEXT
);

CREATE INDEX idx_driver_shifts_driver ON driver_shifts(driver_id, started_at DESC);

-- A driver can have at most one open shift at a time. The unique partial
-- index makes the contract explicit; /api/driver/shifts/start enforces it
-- before the insert too for a friendlier error.
CREATE UNIQUE INDEX idx_driver_shifts_one_open
  ON driver_shifts(driver_id) WHERE ended_at IS NULL;

ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own shifts"
  ON driver_shifts FOR ALL
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all shifts"
  ON driver_shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
