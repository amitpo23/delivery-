import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Ownership check for drivers (admins skip).
  if (guard.role === "driver") {
    const { data: route } = await admin
      .from("routes")
      .select("id, driver_id")
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

  const { data, error } = await admin
    .from("routes")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "planned")
    .select("id, status, started_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Route is not in planned state" }, { status: 409 });

  return NextResponse.json({ route: data });
}
