import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketNumber } from "@/lib/tickets/numbers";
import { slaDeadline, slaHoursFor } from "@/lib/orders/sla";
import type { ServiceType } from "@/types";

/**
 * Sweeps orders that breached their SLA and creates an `auto_late`
 * ticket per breach. Different from check-stale-orders (24h flat) —
 * this one respects the per-tier SLA published to the customer.
 *
 * Idempotent via the unique partial index on (order_id, source) from
 * migration 011.
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

  // Pull all currently-undelivered, *paid* orders. Filtering "breached"
  // in JS lets us reuse the slaDeadline() rules without duplicating them
  // in SQL. Unpaid orders are excluded — they live in the payment funnel
  // and have their own zombie sweep.
  const { data: openOrders, error } = await admin
    .from("orders")
    .select("id, order_number, status, service_type, created_at, customer_id, booker_phone")
    .in("status", ["pending", "confirmed", "assigned", "picked_up", "in_transit"])
    .eq("payment_status", "paid")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const breached = (openOrders ?? []).filter((o) => {
    const deadline = slaDeadline(o.created_at, o.service_type as ServiceType);
    return now > deadline;
  });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const o of breached) {
    const breachedHoursAgo = Math.round(
      (now.getTime() -
        slaDeadline(o.created_at, o.service_type as ServiceType).getTime()) /
        3_600_000,
    );
    const slaHours = slaHoursFor(o.service_type as ServiceType);

    const { error: insertErr } = await admin.from("tickets").insert({
      ticket_number: generateTicketNumber(),
      customer_id: o.customer_id ?? null,
      customer_phone: o.booker_phone ?? null,
      order_id: o.id,
      subject: `SLA breach: ${o.order_number} (${o.service_type}, ${slaHours}h) — איחור ${breachedHoursAgo}h`,
      description: `הזמנה זו עברה את ה-SLA המובטח (${slaHours} שעות) ב-${breachedHoursAgo} שעות. הסטטוס הנוכחי: ${o.status}.`,
      priority: breachedHoursAgo > 12 ? "urgent" : "high",
      source: "auto_late",
    });

    if (insertErr) {
      // 23505 = idempotency dedup; expected on subsequent sweeps.
      if ((insertErr as { code?: string }).code !== "23505") {
        skipped.push(`${o.order_number}:${insertErr.message}`);
      } else {
        skipped.push(o.order_number);
      }
    } else {
      created.push(o.order_number);
    }
  }

  return NextResponse.json({
    scanned: openOrders?.length ?? 0,
    breached: breached.length,
    created: created.length,
    skipped: skipped.length,
    now: now.toISOString(),
  });
}
