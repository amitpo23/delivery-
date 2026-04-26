-- =============================================
-- Migration 003: P0 fixes, narrow zones, pricing multipliers, POD storage
-- =============================================

-- =============================================
-- 1. P0 SECURITY FIX
-- =============================================
-- The original policy "Anyone can track by order number" used USING (true),
-- which exposed every order to any anonymous caller. Public tracking will be
-- served by a filtered route handler (service role + selected columns) in a
-- later migration; for now, only authenticated owners/drivers/admins see orders.
DROP POLICY IF EXISTS "Anyone can track by order number" ON orders;

-- =============================================
-- 2. PRICING MULTIPLIERS
-- =============================================
-- Formula target: price = base × weight × zone × urgency × surge
-- We add the multipliers to the existing tables instead of renaming.
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS towns TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE pricing_rules
  ADD COLUMN IF NOT EXISTS urgency_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0;

-- =============================================
-- 3. NARROW THE ZONE SEED TO ACTUAL COVERAGE
-- =============================================
-- Coverage area (per client): Haifa, מ"א מגידו, מ"א גלבוע, מ"א בקעת בית שאן,
-- עפולה, התענכים. The original seed listed broader northern Israel and is
-- replaced wholesale. Drivers.zone_id is nullable so this is safe pre-prod.
DELETE FROM zones;

INSERT INTO zones (name, description, base_price, price_per_km, max_delivery_time_hours, multiplier, towns) VALUES
  (
    'חיפה',
    'העיר חיפה והרובעים',
    20, 1.0, 4, 1.0,
    ARRAY['חיפה', 'נווה שאנן', 'הדר', 'כרמל', 'בת גלים', 'נשר']
  ),
  (
    'מועצה אזורית מגידו',
    'יישובי מועצה אזורית מגידו',
    30, 1.4, 6, 1.1,
    ARRAY['יקנעם המושבה', 'מדרך עוז', 'מגידו', 'רמות מנשה', 'משמר העמק', 'עין השופט', 'הזורע', 'דליה', 'מדרך עוז', 'גלעד', 'אליקים', 'מדרך עוז']
  ),
  (
    'מועצה אזורית גלבוע',
    'יישובי מועצה אזורית גלבוע',
    30, 1.4, 6, 1.1,
    ARRAY['בית השיטה', 'גן נר', 'דבורה', 'הרדוף', 'חבר', 'יזרעאל', 'מולדת', 'מיטב', 'נורית', 'נירעוז', 'עין החורש', 'עין חרוד איחוד', 'עין חרוד מאוחד', 'פרזון', 'רמת צבי', 'תל יוסף', 'מגן שאול']
  ),
  (
    'מועצה אזורית בקעת בית שאן',
    'יישובי מועצה אזורית בקעת בית שאן',
    35, 1.5, 8, 1.2,
    ARRAY['בית שאן', 'גשר', 'חמדיה', 'טירת צבי', 'כפר רופין', 'מסילות', 'מעלה גלבוע', 'מעוז חיים', 'נווה איתן', 'נווה אור', 'ניר דוד', 'רחוב', 'רויה', 'רשפים', 'שדה אליהו', 'שדה נחום', 'שלוחות', 'שלפים', 'שדי תרומות']
  ),
  (
    'עפולה',
    'העיר עפולה',
    25, 1.2, 6, 1.0,
    ARRAY['עפולה', 'עפולה עילית']
  ),
  (
    'התענכים',
    'יישובי התענכים',
    30, 1.4, 6, 1.1,
    ARRAY['גבעת עוז', 'מגן שאול', 'עין דור', 'תל עדשים', 'עדנים', 'עדי', 'נהלל', 'בלפוריה', 'דברת', 'מרחביה', 'כפר ברוך', 'מזרע', 'גזית']
  );

-- =============================================
-- 4. URGENCY MULTIPLIERS ON PRICING RULES
-- =============================================
-- Standard 1.0 / Same-Day 1.4 / Express 2.2 / Economy 0.85 (per spec)
UPDATE pricing_rules SET urgency_multiplier = 2.2  WHERE service_type = 'express';
UPDATE pricing_rules SET urgency_multiplier = 1.4  WHERE service_type = 'same_day';
UPDATE pricing_rules SET urgency_multiplier = 1.0  WHERE service_type = 'next_day';
UPDATE pricing_rules SET urgency_multiplier = 0.85 WHERE service_type = 'economy';

-- =============================================
-- 5. STORAGE: PROOF-OF-DELIVERY BUCKET
-- =============================================
-- Created idempotently. Drivers upload, customers/admins read.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod-images', 'pod-images', false)
ON CONFLICT (id) DO NOTHING;

-- Drivers can upload to their assigned orders' folder (path prefix = order_id)
DROP POLICY IF EXISTS "Drivers upload POD" ON storage.objects;
CREATE POLICY "Drivers upload POD"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pod-images'
    AND EXISTS (
      SELECT 1 FROM orders o
      JOIN drivers d ON d.id = o.driver_id
      WHERE d.user_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
  );

-- Customers can read POD for their own orders
DROP POLICY IF EXISTS "Customers read own POD" ON storage.objects;
CREATE POLICY "Customers read own POD"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pod-images'
    AND EXISTS (
      SELECT 1 FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
  );

-- Admins read all POD
DROP POLICY IF EXISTS "Admins read all POD" ON storage.objects;
CREATE POLICY "Admins read all POD"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pod-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
