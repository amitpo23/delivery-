import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancels orders that started Sumit hosted-payment but never paid —
 * customer closed the tab, IPN never arrived, or the redirect timed
 * out. Without this sweep zombies pile up in `payment_status=pending`
 * and pollute the admin dashboard.
 *
 * A zombie is an order that has `payment_initiated_at` older than 1h
 * AND is still `payment_status=pending`. We flip it to
 * `status='cancelled' / payment_status='cancelled'` and cancel any
 * pending coupon_redemptions row so the coupon's per-phone limit
 * doesn't lock out a legitimate retry.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */

const ZOMBIE_AFTER_HOURS = 1;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = req.headers.get("authorization");
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - ZOMBIE_AFTER_HOURS * 3600 * 1000).toISOString();

  const { data: zombies, error } = await admin
    .from("orders")
    .select("id, order_number")
    .eq("payment_status", "pending")
    .lt("payment_initiated_at", cutoff)
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (zombies ?? []).map((z) => z.id);
  if (ids.length === 0) {
    return NextResponse.json({ scanned: 0, cancelled: 0, cutoff });
  }

  // Race guard: a delayed IPN that flipped the order to 'paid' between
  // our SELECT and this UPDATE must not be clobbered.
  const { error: updateErr } = await admin
    .from("orders")
    .update({
      payment_status: "cancelled",
      status: "cancelled",
      cancellation_reason: "תשלום לא הושלם — הסליקה לא חזרה תוך שעה",
    })
    .in("id", ids)
    .eq("payment_status", "pending");

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await admin
    .from("coupon_redemptions")
    .update({ status: "cancelled" })
    .in("order_id", ids)
    .eq("status", "pending");

  return NextResponse.json({
    scanned: ids.length,
    cancelled: ids.length,
    cutoff,
    orderNumbers: (zombies ?? []).map((z) => z.order_number),
  });
}
