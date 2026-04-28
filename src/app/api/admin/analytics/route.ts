import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin dashboard KPIs + 30-day time series.
 * Pulled in one round trip and aggregated server-side so the dashboard
 * doesn't fan out into a dozen client queries.
 */
export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [ordersRes, driversRes, ticketsRes] = await Promise.all([
    admin
      .from("orders")
      .select("id, status, service_type, estimated_price, final_price, created_at, delivered_at, pickup_address, delivery_address")
      .gte("created_at", since),
    admin
      .from("drivers")
      .select("id, status, total_deliveries, rating_avg, profile:profiles!drivers_user_id_fkey(full_name)"),
    admin
      .from("tickets")
      .select("id, status, priority")
      .in("status", ["open", "in_progress"]),
  ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  const orders = ordersRes.data ?? [];
  const drivers = driversRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  // ---- Counts ----
  const totalOrders = orders.length;
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => ["cancelled", "returned"].includes(o.status));
  const pending = orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  const active = orders.filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));

  const totalRevenue = delivered.reduce(
    (sum, o) => sum + Number(o.final_price ?? o.estimated_price ?? 0),
    0,
  );
  const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0;

  // ---- 30-day buckets (UTC days) ----
  const dayMap = new Map<string, { orders: number; revenue: number }>();
  for (let d = 29; d >= 0; d--) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - d);
    dayMap.set(day.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
  }
  for (const o of orders) {
    const day = o.created_at.slice(0, 10);
    const bucket = dayMap.get(day);
    if (bucket) {
      bucket.orders += 1;
      if (o.status === "delivered") {
        bucket.revenue += Number(o.final_price ?? o.estimated_price ?? 0);
      }
    }
  }
  const series = Array.from(dayMap.entries()).map(([day, v]) => ({
    day,
    orders: v.orders,
    revenue: Math.round(v.revenue),
  }));

  // ---- Service type split ----
  const byService: Record<string, number> = {};
  for (const o of orders) {
    byService[o.service_type] = (byService[o.service_type] ?? 0) + 1;
  }

  // ---- Top destination zones (rough — first word) ----
  const byZone: Record<string, number> = {};
  for (const o of orders) {
    const first = (o.delivery_address ?? "").split(/[\s,]/)[0];
    if (!first) continue;
    byZone[first] = (byZone[first] ?? 0) + 1;
  }
  const topZones = Object.entries(byZone)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([zone, count]) => ({ zone, count }));

  // ---- On-time-ness: delivered orders in <24h count as "on time" for the
  // express tier, <48h for the rest. Crude until we wire real SLAs. ----
  let onTime = 0;
  for (const o of delivered) {
    if (!o.delivered_at) continue;
    const ms = new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime();
    const h = ms / 3600000;
    const limit = o.service_type === "express" ? 24 : 48;
    if (h <= limit) onTime += 1;
  }
  const onTimeRate = delivered.length > 0 ? onTime / delivered.length : 1;

  // ---- Driver leaderboard ----
  type DriverRow = {
    id: string;
    status: string;
    total_deliveries: number | null;
    rating_avg: number | null;
    profile: { full_name: string } | { full_name: string }[] | null;
  };
  const driverList = (drivers as DriverRow[])
    .map((d) => {
      const p = Array.isArray(d.profile) ? d.profile[0] : d.profile;
      return {
        id: d.id,
        name: p?.full_name ?? "—",
        status: d.status,
        deliveries: d.total_deliveries ?? 0,
        rating: d.rating_avg ? Number(d.rating_avg) : null,
      };
    })
    .sort((a, b) => b.deliveries - a.deliveries)
    .slice(0, 5);

  return NextResponse.json({
    range: { since, days: 30 },
    counts: {
      total: totalOrders,
      delivered: delivered.length,
      cancelled: cancelled.length,
      pending: pending.length,
      active: active.length,
    },
    revenue: {
      total: Math.round(totalRevenue),
      avg_ticket: Math.round(avgTicket),
    },
    on_time_rate: Math.round(onTimeRate * 1000) / 10, // percent with one decimal
    series,
    by_service: byService,
    top_zones: topZones,
    drivers: {
      total: drivers.length,
      online: drivers.filter((d) => d.status !== "offline").length,
      leaderboard: driverList,
    },
    tickets: {
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      urgent: tickets.filter((t) => t.priority === "urgent").length,
    },
  });
}
