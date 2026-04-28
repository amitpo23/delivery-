import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice } from "@/lib/pricing/engine";
import { estimateZoneDistanceKm, resolveSubZone, resolveZone } from "@/lib/pricing/zones";
import { getPaymentProvider, PaymentError } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateOrderNumber } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding/google";
import { haversineKm } from "@/lib/geo/distance";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";
import { validateCoupon, redeemCoupon } from "@/lib/coupons/redeem";
import { getEmailSender } from "@/lib/email/resend";
import { orderConfirmationEmail } from "@/lib/email/templates";

const Body = z.object({
  pickupAddress: z.string().min(2),
  pickupContactName: z.string().min(1),
  pickupContactPhone: z.string().min(7),
  pickupNotes: z.string().optional(),
  deliveryAddress: z.string().min(2),
  deliveryContactName: z.string().min(1),
  deliveryContactPhone: z.string().min(7),
  deliveryNotes: z.string().optional(),
  size: z.enum(["S", "M", "L", "XL"]),
  category: z.string(),
  fragile: z.boolean().optional().default(false),
  insurance: z.boolean().optional().default(false),
  declaredValue: z.number().nonnegative().optional(),
  urgency: z.enum(["express", "same_day", "next_day", "economy"]),
  timeWindow: z.string(),
  distanceKm: z.number().nonnegative().max(500),
  quoteTotal: z.number().positive(),
  card: z.object({
    holderName: z.string().min(1),
    last4: z.string().regex(/^\d{4}$/).optional(),
  }),
  bookerEmail: z.string().email().optional(),
  couponCode: z.string().min(2).max(40).optional(),
});

const URGENCY_TO_SERVICE = {
  express: "express",
  same_day: "same_day",
  next_day: "next_day",
  economy: "economy",
} as const;

const SIZE_TO_PACKAGE_TYPE = {
  S: "small_package",
  M: "package",
  L: "package",
  XL: "heavy",
} as const;

const SIZE_TO_WEIGHT_KG = { S: 3, M: 8, L: 20, XL: 40 } as const;

export async function POST(req: Request) {
  // 10 orders/min per IP. Each /booking submit creates a charge + 2 geocodes,
  // so the cost of abuse is high — keep this aggressive.
  const rl = rateLimit(`orders:${getRequestIp(req)}`, { max: 10, refillPerMinute: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const v = Body.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }
  const b = v.data;

  const pickupZone = resolveZone(b.pickupAddress);
  const deliveryZone = resolveZone(b.deliveryAddress);
  if (!pickupZone || !deliveryZone) {
    return NextResponse.json({ error: "Address outside coverage area" }, { status: 422 });
  }

  // Distance: geocode both endpoints when possible and use the great-circle
  // distance as a tighter floor than the coarse zone matrix. The client's
  // distanceKm stays advisory (clamped). No-geocode case is unchanged.
  const [pickupGeo, deliveryGeo] = await Promise.all([
    geocodeAddress(b.pickupAddress),
    geocodeAddress(b.deliveryAddress),
  ]);
  const zoneFloorKm = estimateZoneDistanceKm(pickupZone, deliveryZone);
  const geoFloorKm =
    pickupGeo && deliveryGeo ? haversineKm(pickupGeo, deliveryGeo) : 0;
  const distanceKm = Math.max(zoneFloorKm, geoFloorKm, Math.min(b.distanceKm, 500));

  const pickupSubZone = resolveSubZone(b.pickupAddress, pickupZone);
  const deliverySubZone = resolveSubZone(b.deliveryAddress, deliveryZone);
  const subZoneFactor = Math.max(pickupSubZone.multiplier, deliverySubZone.multiplier);

  const fresh = calculatePrice({
    pickupZone,
    deliveryZone,
    distanceKm,
    size: b.size,
    urgency: b.urgency,
    fragile: b.fragile,
    insurance: b.insurance,
    declaredValue: b.declaredValue,
    subZoneFactor,
  });

  // Tolerance widened from ±1₪ to ±3₪ now that the quote and the order both
  // hit the Google Geocoder. On serverless cold starts the geocoding LRU
  // cache isn't shared between instances, so two calls for the same address
  // can return slightly different lat/lng (sub-meter) and yield a Haversine
  // delta worth a few agorot once it propagates through the size/zone/urgency
  // multipliers. ±3₪ is well below "the user got a different price" UX harm
  // and well above the realistic floating-point/geocoder drift.
  if (Math.abs(fresh.total - b.quoteTotal) > 3) {
    return NextResponse.json(
      { error: "Price mismatch — please refresh", expected: fresh.total, recomputed: fresh.total },
      { status: 409 }
    );
  }

  // Coupon — validated again server-side to prevent client tampering with
  // discount amount. The total charged reflects the verified discount.
  let couponId: string | null = null;
  let couponDiscount = 0;
  let chargeTotal = fresh.total;
  if (b.couponCode) {
    const coupon = await validateCoupon({
      code: b.couponCode,
      subtotal: fresh.total,
      phone: b.pickupContactPhone,
    });
    if (coupon.valid && coupon.couponId && coupon.discount) {
      couponId = coupon.couponId;
      couponDiscount = coupon.discount;
      chargeTotal = Math.max(0, Math.round((fresh.total - couponDiscount) * 100) / 100);
    }
    // Invalid codes silently fail through — the booking still goes at full
    // price. The /api/coupons/validate UI surface tells the user upfront.
  }

  const orderNumber = generateOrderNumber();

  const provider = getPaymentProvider();
  let charge;
  try {
    charge = await provider.createCharge({
      amount: chargeTotal,
      currency: "ILS",
      orderId: orderNumber,
      customer: {
        name: b.card.holderName,
        phone: b.pickupContactPhone,
        email: b.bookerEmail,
      },
      card: { holderName: b.card.holderName, last4: b.card.last4 },
      metadata: { orderNumber, urgency: b.urgency, size: b.size },
    });
  } catch (err) {
    const reason = err instanceof PaymentError ? err.message : "Payment failed";
    return NextResponse.json({ error: reason }, { status: 402 });
  }

  // If the booker is signed in and already has a customer row, attach the
  // order to it so /orders + /dashboard surface this booking through RLS.
  // Guests (or signed-in users without a customer row yet) keep customer_id
  // null and rely on booker_* fields + /track/[orderNumber] for follow-up.
  let customerId: string | null = null;
  try {
    const session = await createServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      const { data: customer } = await session
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (customer) customerId = customer.id;
    }
  } catch {
    // Server client failure is non-fatal — fall through and treat as guest.
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Server is not connected to Supabase yet — payment was processed in stub mode but the order was not persisted.",
        details: err instanceof Error ? err.message : String(err),
        orderNumber,
        paymentTransactionId: charge.transactionId,
      },
      { status: 503 }
    );
  }

  const { data: inserted, error } = await admin.from("orders").insert({
    order_number: orderNumber,
    customer_id: customerId,
    booker_full_name: b.card.holderName,
    booker_phone: b.pickupContactPhone,
    booker_email: b.bookerEmail ?? null,
    status: "pending",
    service_type: URGENCY_TO_SERVICE[b.urgency],
    pickup_address: b.pickupAddress,
    pickup_lat: pickupGeo?.lat ?? null,
    pickup_lng: pickupGeo?.lng ?? null,
    pickup_contact_name: b.pickupContactName,
    pickup_contact_phone: b.pickupContactPhone,
    delivery_address: b.deliveryAddress,
    delivery_lat: deliveryGeo?.lat ?? null,
    delivery_lng: deliveryGeo?.lng ?? null,
    delivery_contact_name: b.deliveryContactName,
    delivery_contact_phone: b.deliveryContactPhone,
    package_type: SIZE_TO_PACKAGE_TYPE[b.size],
    package_size: b.size,
    package_category: b.category,
    package_weight_kg: SIZE_TO_WEIGHT_KG[b.size],
    package_description: b.deliveryNotes ?? null,
    special_instructions: b.pickupNotes ?? null,
    is_fragile: b.fragile ?? false,
    insurance_amount: b.declaredValue ?? null,
    distance_km: distanceKm,
    time_window: b.timeWindow,
    estimated_price: fresh.total,
    final_price: chargeTotal,
    payment_status: "paid",
    payment_method: "credit_card",
    payment_provider: charge.provider,
    payment_transaction_id: charge.transactionId,
    // Trust the provider's reported last4 over the client's. In stub mode this
    // echoes b.card.last4; in live mode it is the value the gateway saw.
    card_last4: charge.cardLast4 ?? null,
  }).select("id").single();

  // Money-loss guard: if the DB insert fails after the charge succeeded, refund
  // the customer immediately so we don't bill for an order we never persisted.
  // Refund failures are logged in the response so the operator can reconcile.
  if (error || !inserted) {
    let refundStatus: "succeeded" | "failed" | "skipped" = "skipped";
    let refundDetails: string | undefined;
    try {
      const refund = await provider.refundCharge(charge.transactionId, fresh.total);
      refundStatus = refund.status === "succeeded" ? "succeeded" : "failed";
      refundDetails = refund.reason;
    } catch (refundErr) {
      refundStatus = "failed";
      refundDetails = refundErr instanceof Error ? refundErr.message : String(refundErr);
    }
    return NextResponse.json(
      {
        error: "Order persistence failed",
        details: error?.message ?? "no row returned",
        orderNumber,
        paymentTransactionId: charge.transactionId,
        refundStatus,
        refundDetails,
      },
      { status: 500 }
    );
  }

  await admin.from("order_status_history").insert({
    order_id: inserted.id,
    status: "pending",
    notes: "Order created via /booking",
  });

  // Redeem after the order is in — if redemption fails, the order is still
  // valid; we just lose the audit row. Acceptable trade for atomicity.
  if (couponId && couponDiscount > 0) {
    await redeemCoupon({
      couponId,
      orderId: inserted.id,
      phone: b.pickupContactPhone,
      amount: couponDiscount,
    });
  }

  // Best-effort confirmation email. Failure here doesn't roll back the
  // order — the customer still has /track/[orderNumber] regardless.
  if (b.bookerEmail) {
    try {
      const sender = getEmailSender();
      await sender.send(
        orderConfirmationEmail({
          to: b.bookerEmail,
          orderNumber,
          total: chargeTotal,
          pickupAddress: b.pickupAddress,
          deliveryAddress: b.deliveryAddress,
          bookerName: b.card.holderName,
        }),
      );
    } catch (err) {
      console.error("[email] order confirmation failed", err);
    }
  }

  return NextResponse.json({
    orderNumber,
    paymentTransactionId: charge.transactionId,
    total: chargeTotal,
    couponDiscount,
  });
}
