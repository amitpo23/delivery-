import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextRun, type Frequency } from "@/lib/recurring/schedule";
import { calculatePrice } from "@/lib/pricing/engine";
import { resolveZone, resolveSubZone, estimateZoneDistanceKm } from "@/lib/pricing/zones";
import { generateOrderNumber } from "@/lib/utils";

const SIZE_TO_PACKAGE_TYPE = {
  S: "small_package",
  M: "package",
  L: "package",
  XL: "heavy",
} as const;
const SIZE_TO_WEIGHT_KG = { S: 3, M: 8, L: 20, XL: 40 } as const;

/**
 * Materializes any recurring template whose next_run_at is due. Each fire
 * creates a fresh `orders` row + a recurring_runs audit entry, then bumps
 * next_run_at to the next slot. Idempotent within a fire window because
 * we update next_run_at before the next read.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers.get("authorization");
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("recurring_orders")
    .select("*")
    .eq("active", true)
    .lte("next_run_at", nowIso)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let created = 0;
  let failed = 0;
  const details: Array<{ id: string; ok: boolean; reason?: string; orderNumber?: string }> = [];

  for (const r of due ?? []) {
    try {
      const pickupZone = resolveZone(r.pickup_address);
      const deliveryZone = resolveZone(r.delivery_address);
      if (!pickupZone || !deliveryZone) {
        await admin.from("recurring_runs").insert({
          recurring_id: r.id,
          status: "failed",
          error_reason: "Address outside coverage",
        });
        failed += 1;
        details.push({ id: r.id, ok: false, reason: "coverage" });
        // Still advance the schedule so we don't loop forever.
      } else {
        const pickupSub = resolveSubZone(r.pickup_address, pickupZone);
        const deliverySub = resolveSubZone(r.delivery_address, deliveryZone);
        const distanceKm = estimateZoneDistanceKm(pickupZone, deliveryZone);
        const quote = calculatePrice({
          pickupZone,
          deliveryZone,
          distanceKm,
          size: r.size,
          urgency: r.urgency,
          subZoneFactor: Math.max(pickupSub.multiplier, deliverySub.multiplier),
        });

        const orderNumber = generateOrderNumber();
        const { data: inserted, error: insertErr } = await admin
          .from("orders")
          .insert({
            order_number: orderNumber,
            customer_id: r.customer_id ?? null,
            booker_full_name: r.booker_full_name,
            booker_phone: r.booker_phone,
            booker_email: r.booker_email,
            status: "pending",
            service_type: r.urgency,
            pickup_address: r.pickup_address,
            pickup_contact_name: r.pickup_contact_name,
            pickup_contact_phone: r.pickup_contact_phone,
            delivery_address: r.delivery_address,
            delivery_contact_name: r.delivery_contact_name,
            delivery_contact_phone: r.delivery_contact_phone,
            package_type: SIZE_TO_PACKAGE_TYPE[r.size as keyof typeof SIZE_TO_PACKAGE_TYPE],
            package_size: r.size,
            package_weight_kg: SIZE_TO_WEIGHT_KG[r.size as keyof typeof SIZE_TO_WEIGHT_KG],
            special_instructions: r.notes ?? null,
            distance_km: distanceKm,
            estimated_price: quote.total,
            final_price: quote.total,
            payment_status: "pending",
            payment_method: "invoice",
          })
          .select("id")
          .single();

        if (insertErr || !inserted) {
          await admin.from("recurring_runs").insert({
            recurring_id: r.id,
            status: "failed",
            error_reason: insertErr?.message ?? "Insert failed",
          });
          failed += 1;
          details.push({ id: r.id, ok: false, reason: insertErr?.message });
        } else {
          await admin.from("recurring_runs").insert({
            recurring_id: r.id,
            order_id: inserted.id,
            status: "ok",
          });
          await admin.from("order_status_history").insert({
            order_id: inserted.id,
            status: "pending",
            notes: `Materialized from recurring ${r.name}`,
          });
          created += 1;
          details.push({ id: r.id, ok: true, orderNumber });
        }
      }
    } catch (err) {
      await admin.from("recurring_runs").insert({
        recurring_id: r.id,
        status: "failed",
        error_reason: err instanceof Error ? err.message : String(err),
      });
      failed += 1;
      details.push({ id: r.id, ok: false, reason: "exception" });
    }

    // Advance the schedule even when this fire failed, otherwise the
    // cron will keep trying and pile up runs.
    const nextDate = nextRun({
      from: new Date(),
      frequency: r.frequency as Frequency,
      weekday: r.weekday ?? null,
      hourOfDay: r.hour_of_day,
    });
    await admin
      .from("recurring_orders")
      .update({ next_run_at: nextDate.toISOString() })
      .eq("id", r.id);
  }

  return NextResponse.json({ scanned: due?.length ?? 0, created, failed, details });
}
