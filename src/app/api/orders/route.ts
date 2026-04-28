import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice } from "@/lib/pricing/engine";
import { estimateZoneDistanceKm, resolveSubZone, resolveZone } from "@/lib/pricing/zones";
import { getPaymentProvider, PaymentError } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderNumber } from "@/lib/utils";

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

  // Distance is computed server-side from the resolved zones; the client's
  // `distanceKm` is treated as advisory only and clamped to >= the zone-pair
  // floor. This blocks the "force a long delivery to be priced as a short one"
  // attack flagged in the PR #4 review.
  const zoneFloorKm = estimateZoneDistanceKm(pickupZone, deliveryZone);
  const distanceKm = Math.max(zoneFloorKm, Math.min(b.distanceKm, 500));

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

  if (Math.abs(fresh.total - b.quoteTotal) > 1) {
    return NextResponse.json(
      { error: "Price mismatch — please refresh", expected: fresh.total, recomputed: fresh.total },
      { status: 409 }
    );
  }

  const orderNumber = generateOrderNumber();

  const provider = getPaymentProvider();
  let charge;
  try {
    charge = await provider.createCharge({
      amount: fresh.total,
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
    customer_id: null,
    booker_full_name: b.card.holderName,
    booker_phone: b.pickupContactPhone,
    booker_email: b.bookerEmail ?? null,
    status: "pending",
    service_type: URGENCY_TO_SERVICE[b.urgency],
    pickup_address: b.pickupAddress,
    pickup_contact_name: b.pickupContactName,
    pickup_contact_phone: b.pickupContactPhone,
    delivery_address: b.deliveryAddress,
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
    final_price: fresh.total,
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

  return NextResponse.json({
    orderNumber,
    paymentTransactionId: charge.transactionId,
    total: fresh.total,
  });
}
