-- =============================================
-- Migration 004: Guest (anonymous) bookings
-- =============================================
-- The /booking flow does not require login. Orders may be placed with no
-- associated customers row — we store the booker's contact details directly
-- and mark the row as a guest by leaving customer_id NULL.

-- 1. Allow null customer_id for guest orders
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Guest contact + booking metadata
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS booker_full_name TEXT,
  ADD COLUMN IF NOT EXISTS booker_phone TEXT,
  ADD COLUMN IF NOT EXISTS booker_email TEXT,
  ADD COLUMN IF NOT EXISTS package_size TEXT
    CHECK (package_size IS NULL OR package_size IN ('S','M','L','XL')),
  ADD COLUMN IF NOT EXISTS package_category TEXT,
  ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS time_window TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT;
