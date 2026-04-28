import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketNumber } from "@/lib/tickets/numbers";

/**
 * Cron-driven sweep that creates an `auto_pending` ticket for any order
 * that's been stuck in `pending`/`confirmed` for more than 24 hours.
 *
 * Idempotent — migration 011's unique partial index on
 * (order_id, source) blocks duplicates, so re-running the cron only
 * surfaces newly-stale orders.
 *
 * Auth: Vercel Cron jobs send `Authorization: Bearer <CRON_SECRET>`
 * automatically when CRON_SECRET is set in the project. Reject anything
 * else so the endpoint can't be hit publicly.
 */

const STALE_AFTER_HOURS = 24;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers.get("authorization");
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_AFTER_HOURS * 3600 * 1000).toISOString();

  const { data: stale, error } = await admin
    .from("orders")
    .select("id, order_number, customer_id, booker_phone, created_at, status")
    .in("status", ["pending", "confirmed"])
    .lt("created_at", cutoff)
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = stale ?? [];
  const created: string[] = [];
  const skipped: string[] = [];

  for (const o of orders) {
    const ageH = Math.round((Date.now() - new Date(o.created_at).getTime()) / 3600000);
    const insert = await admin
      .from("tickets")
      .insert({
        ticket_number: generateTicketNumber(),
        customer_id: o.customer_id ?? null,
        customer_phone: o.booker_phone ?? null,
        order_id: o.id,
        subject: `הזמנה ${o.order_number} תקועה ב-${o.status} כבר ${ageH}h`,
        description: "נוצר אוטומטית ע״י סורק ההזמנות התקועות. בדקו אם צריך לשייך נהג ידנית או לבטל.",
        priority: ageH > 48 ? "high" : "normal",
        source: "auto_pending",
      })
      .select("id")
      .maybeSingle();

    if (insert.error) {
      // 23505 = unique violation = idempotent dedup; treat as "already covered".
      if ((insert.error as { code?: string }).code === "23505") {
        skipped.push(o.order_number);
      } else {
        skipped.push(`${o.order_number}:${insert.error.message}`);
      }
    } else {
      created.push(o.order_number);
    }
  }

  return NextResponse.json({
    scanned: orders.length,
    created: created.length,
    skipped: skipped.length,
    cutoff,
  });
}
