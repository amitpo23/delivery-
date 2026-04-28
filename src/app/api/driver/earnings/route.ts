import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Driver earnings: simple percentage of the delivered order's price,
 * minus a flat platform fee. The percentage is configurable per driver
 * via env until we add a per-driver column. Tips and bonuses come from
 * the existing driver_earnings table (already in migration 002).
 */
const COMMISSION_RATE = Number(process.env.DRIVER_COMMISSION_RATE ?? "0.65");

export async function GET(req: Request) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "week") as "today" | "week" | "month";

  const admin = createAdminClient();

  let driverId: string | null = null;
  if (guard.role === "driver") {
    const { data } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    driverId = data?.id ?? null;
    if (!driverId) {
      return NextResponse.json({
        period,
        commissionRate: COMMISSION_RATE,
        totals: { commission: 0, bonus: 0, tip: 0, penalty: 0, net: 0, deliveries: 0 },
        breakdown: [],
        bonuses: [],
      });
    }
  } else {
    // For admins exploring, allow ?driverId=...
    driverId = url.searchParams.get("driverId");
    if (!driverId) {
      return NextResponse.json({ error: "Admin must pass ?driverId" }, { status: 400 });
    }
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  if (period === "week") since.setUTCDate(since.getUTCDate() - 7);
  if (period === "month") since.setUTCMonth(since.getUTCMonth() - 1);

  const [ordersRes, bonusesRes] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, service_type, final_price, estimated_price, delivered_at")
      .eq("driver_id", driverId)
      .eq("status", "delivered")
      .gte("delivered_at", since.toISOString())
      .order("delivered_at", { ascending: false }),
    admin
      .from("driver_earnings")
      .select("id, amount, type, description, created_at")
      .eq("driver_id", driverId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

  const orders = ordersRes.data ?? [];
  const bonuses = bonusesRes.data ?? [];

  let commission = 0;
  const breakdown = orders.map((o) => {
    const price = Number(o.final_price ?? o.estimated_price ?? 0);
    const earn = Math.round(price * COMMISSION_RATE * 100) / 100;
    commission += earn;
    return {
      id: o.id,
      order_number: o.order_number,
      service_type: o.service_type,
      price,
      commission: earn,
      delivered_at: o.delivered_at,
    };
  });

  const totals = {
    commission: Math.round(commission * 100) / 100,
    bonus: 0,
    tip: 0,
    penalty: 0,
    deliveries: orders.length,
    net: Math.round(commission * 100) / 100,
  };
  for (const b of bonuses) {
    const amt = Number(b.amount);
    if (b.type === "bonus") totals.bonus += amt;
    else if (b.type === "tip") totals.tip += amt;
    else if (b.type === "penalty") totals.penalty += amt;
  }
  totals.bonus = Math.round(totals.bonus * 100) / 100;
  totals.tip = Math.round(totals.tip * 100) / 100;
  totals.penalty = Math.round(totals.penalty * 100) / 100;
  totals.net = Math.round((commission + totals.bonus + totals.tip - totals.penalty) * 100) / 100;

  return NextResponse.json({
    period,
    commissionRate: COMMISSION_RATE,
    since: since.toISOString(),
    totals,
    breakdown,
    bonuses,
  });
}
