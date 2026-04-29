import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/pricing/engine";
import { estimateZoneDistanceKm, resolveSubZone, resolveZone } from "@/lib/pricing/zones";
import { generateOrderNumber } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding/google";
import { haversineKm } from "@/lib/geo/distance";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";
import { validateCoupon } from "@/lib/coupons/redeem";
import { getCreds, sumitPost, SumitApiError } from "@/lib/payments/sumit-client";

/**
 * PCI-safe payment kickoff. The browser sends booking details *without*
 * any card data; we create the order in `pending` payment status,
 * then ask Sumit to host the card form on their domain. The browser
 * gets a redirect URL and navigates there. Sumit notifies us via:
 *   - Browser redirect to /booking/return?... (user-facing path)
 *   - Server IPN webhook to /api/payment/sumit-ipn (truth path)
 *
 * No card field ever touches our server, so we stay outside PCI scope.
 */

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
  bookerFullName: z.string().min(1),
  bookerEmail: z.string().email().optional(),
  couponCode: z.string().min(2).max(40).optional(),
});

const SIZE_TO_PACKAGE_TYPE = {
  S: "small_package",
  M: "package",
  L: "package",
  XL: "heavy",
} as const;
const SIZE_TO_WEIGHT_KG = { S: 3, M: 8, L: 20, XL: 40 } as const;

export async function POST(req: Request) {
  const rl = rateLimit(`payment-begin:${getRequestIp(req)}`, { max: 10, refillPerMinute: 10 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  // Same zone + price recompute logic as /api/orders so the price the
  // hosted page shows matches what we charge.
  const pickupZone = resolveZone(b.pickupAddress);
  const deliveryZone = resolveZone(b.deliveryAddress);
  if (!pickupZone || !deliveryZone) {
    return NextResponse.json({ error: "Address outside coverage area" }, { status: 422 });
  }

  const [pickupGeo, deliveryGeo] = await Promise.all([
    geocodeAddress(b.pickupAddress),
    geocodeAddress(b.deliveryAddress),
  ]);
  const zoneFloorKm = estimateZoneDistanceKm(pickupZone, deliveryZone);
  const geoFloorKm = pickupGeo && deliveryGeo ? haversineKm(pickupGeo, deliveryGeo) : 0;
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

  if (Math.abs(fresh.total - b.quoteTotal) > 3) {
    return NextResponse.json(
      { error: "Price mismatch — please refresh", expected: fresh.total },
      { status: 409 },
    );
  }

  // Coupon — same server-side validation as /api/orders.
  let couponDiscount = 0;
  let couponId: string | null = null;
  if (b.couponCode) {
    const coupon = await validateCoupon({
      code: b.couponCode,
      subtotal: fresh.total,
      phone: b.pickupContactPhone,
    });
    if (coupon.valid && coupon.couponId && coupon.discount) {
      couponId = coupon.couponId;
      couponDiscount = coupon.discount;
    }
  }
  const chargeTotal = Math.max(0, Math.round((fresh.total - couponDiscount) * 100) / 100);

  // Resolve session for portal customer attachment.
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
    // session lookup is non-fatal; fall through to guest order.
  }

  const orderNumber = generateOrderNumber();
  const admin = createAdminClient();
  const { data: inserted, error: insertErr } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      booker_full_name: b.bookerFullName,
      booker_phone: b.pickupContactPhone,
      booker_email: b.bookerEmail ?? null,
      status: "pending",
      service_type: b.urgency,
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
      payment_status: "pending",
      payment_method: "credit_card",
      payment_provider: "sumit",
    })
    .select("id, order_number")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "Order persistence failed" }, { status: 500 });
  }

  await admin.from("order_status_history").insert({
    order_id: inserted.id,
    status: "pending",
    notes: "Awaiting Sumit hosted-payment completion",
  });

  // Stub mode (no Sumit creds): pretend payment succeeded immediately so
  // dev/preview deploys can finish the flow. Production has creds set
  // and goes through the real redirect.
  const creds = getCreds();
  if (!creds) {
    await admin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_transaction_id: `sumit_stub_${Date.now()}`,
      })
      .eq("id", inserted.id);
    if (couponId && couponDiscount > 0) {
      await admin.from("coupon_redemptions").insert({
        coupon_id: couponId,
        order_id: inserted.id,
        phone: b.pickupContactPhone,
        amount_discounted: couponDiscount,
      });
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://delivery-rosy-gamma.vercel.app";
    return NextResponse.json({
      orderNumber: inserted.order_number,
      redirectUrl: `${site}/booking/return?orderNumber=${inserted.order_number}&stub=1`,
    });
  }

  // Live: ask Sumit to host the card form. ExternalIdentifier + IPNURL
  // bind the redirect back to our order so the IPN handler can find it.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://delivery-rosy-gamma.vercel.app";
  const sumitBody = {
    Customer: {
      Name: b.bookerFullName,
      Phone: b.pickupContactPhone,
      EmailAddress: b.bookerEmail ?? null,
      ExternalIdentifier: orderNumber,
    },
    Items: [
      {
        Item: { Name: `הזמנה ${orderNumber}`, SKU: orderNumber, ExternalIdentifier: orderNumber },
        Quantity: 1,
        UnitPrice: chargeTotal,
      },
    ],
    VATIncluded: true,
    // DocumentType is an enum string in this endpoint (Invoice / Receipt /
    // InvoiceAndReceipt / ...), not the integer the charge endpoint takes.
    // Leave empty so Sumit uses the default for the organisation, which is
    // already configured to "InvoiceAndReceipt" in our dashboard.
    DocumentDescription: `אליהב משלוחים — ${orderNumber}`,
    RedirectURL: `${site}/booking/return?orderNumber=${orderNumber}`,
    CancelRedirectURL: `${site}/booking?cancelled=${orderNumber}`,
    ExternalIdentifier: orderNumber,
    Credentials: creds,
    // IPNURL is configured per-organization in the Sumit dashboard, not
    // per-call. Sending it here was getting the request rejected as
    // "Invalid Request JSON" because BeginRedirect_Request doesn't list
    // the field. AutomaticallyRedirectToProviderPaymentPage was rejected
    // for the same reason — the swagger example shows it but the schema
    // does not. Sumit redirects automatically anyway.
  };

  type RedirectResponse = {
    Status?: number;
    UserErrorMessage?: string;
    Data?: { URL?: string; SinglePaymentID?: number };
  };

  let response: RedirectResponse;
  try {
    response = await sumitPost("/billing/payments/beginredirect/", sumitBody);
  } catch (err) {
    const reason = err instanceof SumitApiError ? err.message : "Sumit network error";
    // Attempt cleanup so a failed kickoff doesn't leave a dangling order.
    await admin.from("orders").update({ payment_status: "refunded" }).eq("id", inserted.id);
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  if (response.Status !== 0 || !response.Data?.URL) {
    await admin.from("orders").update({ payment_status: "refunded" }).eq("id", inserted.id);
    return NextResponse.json(
      { error: response.UserErrorMessage ?? "Sumit refused to start payment" },
      { status: 502 },
    );
  }

  // Stash coupon intent so the IPN handler / return page can complete it
  // once the payment actually succeeds. We piggyback in
  // payment_transaction_id temporarily — overwritten on capture.
  if (couponId && couponDiscount > 0) {
    await admin
      .from("orders")
      .update({ payment_transaction_id: `pending:coupon=${couponId}:${couponDiscount}` })
      .eq("id", inserted.id);
  }

  return NextResponse.json({
    orderNumber: inserted.order_number,
    redirectUrl: response.Data.URL,
  });
}
