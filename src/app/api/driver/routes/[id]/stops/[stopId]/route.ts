import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  action: z.enum(["arrive", "complete"]),
});

/**
 * Mark a stop as arrived or completed.
 *
 * - arrive: just stamps arrived_at. No order-status side effect.
 * - complete:
 *     pickup → also flips order.status from assigned → picked_up.
 *     delivery → does NOT flip to delivered; the dedicated POD route
 *       (/api/driver/orders/[id]/deliver) is the only path that flips
 *       to delivered, because it requires photo/signature.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; stopId: string }> },
) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const { id: routeId, stopId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(routeId) || !/^[0-9a-f-]{36}$/i.test(stopId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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

  const admin = createAdminClient();

  const { data: stop, error: readErr } = await admin
    .from("route_stops")
    .select("id, route_id, order_id, stop_type, arrived_at, completed_at")
    .eq("id", stopId)
    .eq("route_id", routeId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!stop) return NextResponse.json({ error: "Stop not found" }, { status: 404 });

  if (guard.role === "driver") {
    const { data: route } = await admin
      .from("routes")
      .select("driver_id, status")
      .eq("id", routeId)
      .maybeSingle();
    if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });
    const { data: driver } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    if (!driver || driver.id !== route.driver_id) {
      return NextResponse.json({ error: "Not your route" }, { status: 403 });
    }
    if (route.status !== "in_progress") {
      return NextResponse.json(
        { error: "Start the route before completing stops" },
        { status: 409 },
      );
    }
  }

  const now = new Date().toISOString();

  if (v.data.action === "arrive") {
    const { data, error } = await admin
      .from("route_stops")
      .update({ arrived_at: now })
      .eq("id", stopId)
      .select("id, arrived_at, completed_at")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ stop: data });
  }

  // complete
  if (stop.completed_at) {
    return NextResponse.json({ error: "Stop already completed" }, { status: 409 });
  }

  const { data: completed, error: completeErr } = await admin
    .from("route_stops")
    .update({ completed_at: now, arrived_at: stop.arrived_at ?? now })
    .eq("id", stopId)
    .is("completed_at", null)
    .select("id, arrived_at, completed_at")
    .maybeSingle();
  if (completeErr) return NextResponse.json({ error: completeErr.message }, { status: 500 });
  if (!completed) {
    return NextResponse.json({ error: "Stop already completed" }, { status: 409 });
  }

  // Side effect on the order — only for pickup. Delivery still funnels
  // through the POD route (photo + signature). If admin needs to flip
  // a delivery stop without POD, they can do so directly through the
  // existing /api/driver/orders/[id]/status route.
  if (stop.stop_type === "pickup") {
    await admin
      .from("orders")
      .update({ status: "picked_up" })
      .eq("id", stop.order_id)
      .eq("status", "assigned");
    await admin.from("order_status_history").insert({
      order_id: stop.order_id,
      status: "picked_up",
      notes: `Picked up via route stop ${stopId}`,
    });
  }

  return NextResponse.json({ stop: completed });
}
