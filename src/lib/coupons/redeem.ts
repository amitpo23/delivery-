import { createAdminClient } from "@/lib/supabase/admin";

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  couponId?: string;
  discount?: number; // ILS
  description?: string;
}

/**
 * Validate a coupon code against an order subtotal + caller phone.
 * Pure read — does NOT redeem. Use redeemCoupon() when persisting the order.
 */
export async function validateCoupon(args: {
  code: string;
  subtotal: number;
  phone: string;
}): Promise<CouponValidation> {
  const code = args.code.trim().toUpperCase();
  if (!code) return { valid: false, reason: "קוד ריק" };

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (!coupon) return { valid: false, reason: "קוד לא קיים או לא פעיל" };

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { valid: false, reason: "הקוד טרם פעיל" };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { valid: false, reason: "הקוד פג תוקף" };
  }
  if (Number(coupon.min_order_amount) > args.subtotal) {
    return { valid: false, reason: `מינימום הזמנה ${coupon.min_order_amount}₪` };
  }

  if (coupon.max_total_uses != null) {
    const { count } = await admin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);
    if ((count ?? 0) >= coupon.max_total_uses) {
      return { valid: false, reason: "הקוד מוצה" };
    }
  }

  if (coupon.max_per_phone > 0 && args.phone) {
    const { count } = await admin
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("phone", args.phone);
    if ((count ?? 0) >= coupon.max_per_phone) {
      return { valid: false, reason: "כבר השתמשת בקוד הזה" };
    }
  }

  let discount = 0;
  if (coupon.reward_type === "flat") {
    discount = Number(coupon.reward_value);
  } else {
    discount = (args.subtotal * Number(coupon.reward_value)) / 100;
    if (coupon.max_discount != null) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  }
  discount = Math.min(discount, args.subtotal); // can't exceed total
  discount = Math.round(discount * 100) / 100;

  return {
    valid: true,
    couponId: coupon.id,
    discount,
    description: coupon.description ?? undefined,
  };
}

export async function redeemCoupon(args: {
  couponId: string;
  orderId: string;
  phone: string;
  amount: number;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("coupon_redemptions").insert({
    coupon_id: args.couponId,
    order_id: args.orderId,
    phone: args.phone,
    amount_discounted: args.amount,
  });
}
