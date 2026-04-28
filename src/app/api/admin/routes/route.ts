import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateBody = z.object({
  driverId: z.string().uuid(),
  /**
   * Stops in driver-visit order. Each entry is `<order_id>:<pickup|delivery>`.
   * Same order can appear twice (once for pickup, once for delivery) so a
   * driver can interleave routes between bookings.
   */
  stops: z
    .array(
      z.object({
        orderId: z.string().uuid(),
        stopType: z.enum(["pickup", "delivery"]),
      }),
    )
    .min(1)
    .max(50),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .select(
      `id, status, notes, started_at, completed_at, created_at, updated_at,
       driver:drivers(
         id,
         profile:profiles!drivers_user_id_fkey(full_name, phone)
       ),
       stops:route_stops(id, sequence, stop_type, arrived_at, completed_at,
         order:orders(id, order_number, status, pickup_address, delivery_address)
       )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ routes: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = CreateBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const orderIds = Array.from(new Set(v.data.stops.map((s) => s.orderId)));

  // Atomic-ish assignment: claim every order whose driver_id is null AND
  // status is one of pending/confirmed/assigned. If any of them is already
  // claimed by someone else we abort and surface the conflict.
  const { data: claimed, error: claimErr } = await admin
    .from("orders")
    .update({ driver_id: v.data.driverId, status: "assigned" })
    .in("id", orderIds)
    .or(`driver_id.is.null,driver_id.eq.${v.data.driverId}`)
    .in("status", ["pending", "confirmed", "assigned"])
    .select("id");

  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });
  const claimedIds = new Set((claimed ?? []).map((c) => c.id));
  const unclaimable = orderIds.filter((id) => !claimedIds.has(id));
  if (unclaimable.length > 0) {
    return NextResponse.json(
      {
        error: "Some orders are no longer assignable",
        unclaimable,
      },
      { status: 409 },
    );
  }

  // Create the route and its stops.
  const { data: route, error: routeErr } = await admin
    .from("routes")
    .insert({
      driver_id: v.data.driverId,
      status: "planned",
      notes: v.data.notes ?? null,
      created_by: guard.user.id,
    })
    .select("id")
    .single();
  if (routeErr || !route) {
    return NextResponse.json({ error: routeErr?.message ?? "Route insert failed" }, { status: 500 });
  }

  const stopRows = v.data.stops.map((s, idx) => ({
    route_id: route.id,
    order_id: s.orderId,
    stop_type: s.stopType,
    sequence: idx + 1,
  }));
  const { error: stopsErr } = await admin.from("route_stops").insert(stopRows);
  if (stopsErr) {
    return NextResponse.json({ error: stopsErr.message }, { status: 500 });
  }

  // Audit each order's status history once.
  for (const id of orderIds) {
    await admin.from("order_status_history").insert({
      order_id: id,
      status: "assigned",
      notes: `Assigned via route ${route.id}`,
    });
  }

  return NextResponse.json({ routeId: route.id, claimed: claimedIds.size });
}
