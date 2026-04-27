-- =============================================
-- Migration 007: RLS for the operational loop
-- =============================================
-- The original schema (001) only granted RLS access to *customers* on orders
-- (own-orders read+create) and didn't grant anything to admins, dispatchers,
-- or drivers. Migration 003 then dropped the public "anyone can track" policy
-- (P0 fix) — leaving admin and driver UIs unable to read orders at all when
-- they go through the browser-side anon client.
--
-- This migration grants the minimum read/write policies the operational loop
-- needs:
--   - Admin/dispatcher: read all orders, read all drivers, read full status
--     history.
--   - Driver: read own driver row, read orders where driver_id = own driver id,
--     read status history of those orders.
--
-- Writes still flow through service-role API routes (`/api/admin/...`,
-- `/api/driver/...`) so we don't loosen UPDATE policies here.

-- =============================================
-- 1. ORDERS
-- =============================================
DROP POLICY IF EXISTS "Admins read all orders" ON orders;
CREATE POLICY "Admins read all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Drivers read own assigned orders" ON orders;
CREATE POLICY "Drivers read own assigned orders"
  ON orders FOR SELECT
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- =============================================
-- 2. DRIVERS
-- =============================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all drivers" ON drivers;
CREATE POLICY "Admins read all drivers"
  ON drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Drivers read own driver row" ON drivers;
CREATE POLICY "Drivers read own driver row"
  ON drivers FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- 3. ORDER STATUS HISTORY
-- =============================================
-- 001 already created "Users can view status history of own orders" but it
-- references customers — drivers and admins are excluded. Add coverage.
DROP POLICY IF EXISTS "Admins read all status history" ON order_status_history;
CREATE POLICY "Admins read all status history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Drivers read history of own orders" ON order_status_history;
CREATE POLICY "Drivers read history of own orders"
  ON order_status_history FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- 4. PROFILES (for join in admin orders → driver name)
-- =============================================
-- 001 has "Users can view own profile" only. The admin orders page joins
-- drivers→profiles to surface the driver name. Without read access to other
-- profiles, the join silently nulls out.
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role IN ('admin', 'dispatcher')
    )
  );
