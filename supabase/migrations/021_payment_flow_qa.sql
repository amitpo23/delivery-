-- =============================================
-- Migration 021: Payment-flow QA hardening
-- =============================================
-- Three changes that close holes the QA pass surfaced in the
-- hosted-payment redirect flow (PR #37):
--
-- 1. orders.payment_initiated_at — timestamp the redirect was kicked off,
--    so the new cancel-zombie-orders cron can find orders that started
--    payment but never paid (browser closed mid-redirect, IPN dropped).
--
-- 2. coupon_redemptions.status — 'pending' is recorded at /api/payment/begin
--    and flipped to 'redeemed' by the IPN handler, replacing the
--    payment_transaction_id="pending:coupon=ID:AMOUNT" string-prefix hack
--    from PR #37. The unique (coupon_id, order_id) index already prevents
--    double redemption on IPN retries, but keeping a dedicated state column
--    means /admin/coupons can show "in flight" usage truthfully.
--
-- 3. cancelled status added to the payment_status check so the new cron
--    can mark zombies as 'cancelled' instead of overloading 'refunded'
--    (which means money actually moved both ways).

ALTER TABLE orders
  ADD COLUMN payment_initiated_at TIMESTAMPTZ;

CREATE INDEX idx_orders_payment_initiated_at
  ON orders(payment_initiated_at)
  WHERE payment_status = 'pending';

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled'));

ALTER TABLE coupon_redemptions
  ADD COLUMN status TEXT NOT NULL DEFAULT 'redeemed'
  CHECK (status IN ('pending', 'redeemed', 'cancelled'));

CREATE INDEX idx_coupon_redemptions_status
  ON coupon_redemptions(status)
  WHERE status = 'pending';
