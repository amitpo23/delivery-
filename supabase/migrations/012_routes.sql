-- =============================================
-- Migration 012: Multi-stop routes
-- =============================================
-- A route is an aggregation of orders that one driver delivers in one
-- trip. The order's existing state machine still applies per-order
-- (assigned → picked_up → in_transit → delivered) — routes simply
-- group the stops and define a sequence.
--
-- Stops carry no copy of address/lat/lng — that's joined in from
-- orders.{pickup,delivery}_{address,lat,lng}, so a single source of
-- truth keeps stop locations correct if the order is ever edited.

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_driver ON routes(driver_id, status);
CREATE INDEX idx_routes_status ON routes(status, created_at DESC);

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- route_stops
-- =============================================
CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  stop_type TEXT NOT NULL CHECK (stop_type IN ('pickup', 'delivery')),
  sequence INTEGER NOT NULL,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, order_id, stop_type)
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id, sequence);
CREATE INDEX idx_route_stops_order ON route_stops(order_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Admins / dispatchers manage everything.
CREATE POLICY "Admins manage routes"
  ON routes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins manage route_stops"
  ON route_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- Drivers read their own route + its stops. Writes go through the
-- /api/driver/routes/[id]/stops/[stopId]/{arrive,complete} routes which
-- use service-role; we don't expose direct write here on purpose.
CREATE POLICY "Drivers read own routes"
  ON routes FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers read stops of own routes"
  ON route_stops FOR SELECT
  USING (
    route_id IN (
      SELECT id FROM routes
      WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );
