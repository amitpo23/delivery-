import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the driver's active route (planned or in_progress) plus all
 * stops with their joined order info. Drivers see at most one active
 * route at a time — admins create new routes only after the previous
 * one is marked completed.
 */
export async function GET() {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  let driverId: string | null = null;
  if (guard.role === "driver") {
    const { data: d } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    driverId = d?.id ?? null;
    if (!driverId) {
      return NextResponse.json({ route: null });
    }
  }

  let q = admin
    .from("routes")
    .select(
      `id, status, notes, started_at, driver_id,
       stops:route_stops(id, sequence, stop_type, arrived_at, completed_at,
         order:orders(id, order_number, status,
           pickup_address, pickup_contact_name, pickup_contact_phone,
           pickup_lat, pickup_lng,
           delivery_address, delivery_contact_name, delivery_contact_phone,
           delivery_lat, delivery_lng,
           package_size, special_instructions
         )
       )`,
    )
    .in("status", ["planned", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (driverId) q = q.eq("driver_id", driverId);

  const { data, error } = await q.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ route: data ?? null });
}
