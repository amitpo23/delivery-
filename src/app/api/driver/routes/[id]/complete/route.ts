import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marks the route as completed once all of its stops have been completed.
 * Refuses with 409 otherwise so a driver can't accidentally close a route
 * with unfinished deliveries.
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid route id" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (guard.role === "driver") {
    const { data: route } = await admin
      .from("routes")
      .select("id, driver_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: driver } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    if (!driver || driver.id !== route.driver_id) {
      return NextResponse.json({ error: "Not your route" }, { status: 403 });
    }
  }

  const { data: openStops } = await admin
    .from("route_stops")
    .select("id")
    .eq("route_id", id)
    .is("completed_at", null);
  if ((openStops?.length ?? 0) > 0) {
    return NextResponse.json(
      { error: `יש עוד ${openStops!.length} עצירות לא מושלמות` },
      { status: 409 },
    );
  }

  const { data, error } = await admin
    .from("routes")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["planned", "in_progress"])
    .select("id, status, completed_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Route already finalized" }, { status: 409 });

  return NextResponse.json({ route: data });
}
