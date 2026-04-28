import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatePrice } from "@/lib/pricing/engine";
import { resolveZone, resolveSubZone, estimateZoneDistanceKm } from "@/lib/pricing/zones";
import { generateOrderNumber } from "@/lib/utils";

const Row = z.object({
  pickupAddress: z.string().min(2),
  pickupContactName: z.string().min(1),
  pickupContactPhone: z.string().min(7),
  deliveryAddress: z.string().min(2),
  deliveryContactName: z.string().min(1),
  deliveryContactPhone: z.string().min(7),
  size: z.enum(["S", "M", "L", "XL"]),
  urgency: z.enum(["express", "same_day", "next_day", "economy"]),
  bookerFullName: z.string().min(1),
  bookerPhone: z.string().min(7),
  bookerEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const Body = z.object({
  rows: z.array(Row).min(1).max(500),
});

const SIZE_TO_PACKAGE_TYPE = {
  S: "small_package",
  M: "package",
  L: "package",
  XL: "heavy",
} as const;
const SIZE_TO_WEIGHT_KG = { S: 3, M: 8, L: 20, XL: 40 } as const;

/**
 * Bulk-create orders for business customers. Each row is priced server-side
 * (no client-supplied total). Skipped rows return their reason; the caller
 * can re-submit only the failed ones.
 *
 * Payment is recorded as `pending` because business customers usually
 * settle on invoice — there's no charge here.
 */
export async function POST(req: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

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

  const admin = createAdminClient();
  type RowResult = { rowIdx: number } & (
    | { status: "ok"; orderNumber: string; total: number }
    | { status: "error"; error: string }
  );
  const results: RowResult[] = [];
  const inserts: Record<string, unknown>[] = [];
  const insertMeta: { rowIdx: number; orderNumber: string; total: number }[] = [];

  v.data.rows.forEach((row, idx) => {
    const pickupZone = resolveZone(row.pickupAddress);
    const deliveryZone = resolveZone(row.deliveryAddress);
    if (!pickupZone || !deliveryZone) {
      results.push({ rowIdx: idx, status: "error", error: "Address outside coverage" });
      return;
    }

    const pickupSub = resolveSubZone(row.pickupAddress, pickupZone);
    const deliverySub = resolveSubZone(row.deliveryAddress, deliveryZone);
    const distanceKm = estimateZoneDistanceKm(pickupZone, deliveryZone);
    const quote = calculatePrice({
      pickupZone,
      deliveryZone,
      distanceKm,
      size: row.size,
      urgency: row.urgency,
      subZoneFactor: Math.max(pickupSub.multiplier, deliverySub.multiplier),
    });

    const orderNumber = generateOrderNumber();
    inserts.push({
      order_number: orderNumber,
      customer_id: null,
      booker_full_name: row.bookerFullName,
      booker_phone: row.bookerPhone,
      booker_email: row.bookerEmail ?? null,
      status: "pending",
      service_type: row.urgency,
      pickup_address: row.pickupAddress,
      pickup_contact_name: row.pickupContactName,
      pickup_contact_phone: row.pickupContactPhone,
      delivery_address: row.deliveryAddress,
      delivery_contact_name: row.deliveryContactName,
      delivery_contact_phone: row.deliveryContactPhone,
      package_type: SIZE_TO_PACKAGE_TYPE[row.size],
      package_size: row.size,
      package_weight_kg: SIZE_TO_WEIGHT_KG[row.size],
      special_instructions: row.notes ?? null,
      distance_km: distanceKm,
      estimated_price: quote.total,
      final_price: quote.total,
      payment_status: "pending",
      payment_method: "invoice",
    });
    insertMeta.push({ rowIdx: idx, orderNumber, total: quote.total });
  });

  if (inserts.length > 0) {
    const { data, error } = await admin.from("orders").insert(inserts).select("id, order_number");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const numberToId = new Map((data ?? []).map((d) => [d.order_number, d.id]));
    for (const meta of insertMeta) {
      const id = numberToId.get(meta.orderNumber);
      if (id) {
        await admin.from("order_status_history").insert({
          order_id: id,
          status: "pending",
          notes: `Bulk imported by ${guard.user.email ?? guard.user.id}`,
        });
        results.push({
          rowIdx: meta.rowIdx,
          status: "ok",
          orderNumber: meta.orderNumber,
          total: meta.total,
        });
      } else {
        results.push({ rowIdx: meta.rowIdx, status: "error", error: "Insert returned no id" });
      }
    }
  }

  results.sort((a, b) => a.rowIdx - b.rowIdx);
  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ created: ok, failed, results });
}
