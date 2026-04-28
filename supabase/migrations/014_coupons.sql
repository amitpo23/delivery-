-- =============================================
-- Migration 014: Coupons / discount codes
-- =============================================
-- Promo codes the customer enters at /booking. Two reward shapes:
-- percent off (capped) or flat amount off. Usage is audited via
-- coupon_redemptions so a code can be configured "once per phone"
-- or "max N total redemptions".

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('percent', 'flat')),
  reward_value NUMERIC NOT NULL CHECK (reward_value > 0),
  -- For percent codes, this is the maximum discount in ₪. NULL = no cap.
  max_discount NUMERIC,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  -- NULL means unlimited.
  max_total_uses INTEGER,
  -- 0 / null disables per-phone gating.
  max_per_phone INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code) WHERE active = true;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  amount_discounted NUMERIC NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

CREATE INDEX idx_coupon_redemptions_phone ON coupon_redemptions(coupon_id, phone);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Admins read coupon_redemptions"
  ON coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
