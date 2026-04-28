import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
  battery: z.number().int().min(0).max(100).optional(),
});

/**
 * Trust model: the body's lat/lng are taken at face value — we don't verify
 * the device is anywhere near the claim. A driver could theoretically POST a
 * fake location for themselves to appear elsewhere on the admin map. They
 * cannot post for *another* driver: requireRole + the user_id→driver_id
 * lookup binds the write to the caller's own driver row. For an MVP that's
 * acceptable — admins still see the order chain (assigned/picked_up/POD) as
 * the source of truth on actual deliveries.
 */
export async function POST(req: Request) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

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

  // Resolve the driver row for the caller. Admins testing this endpoint won't
  // have one; they're rare and we just refuse to write a location for them.
  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (!driver) {
    return NextResponse.json({ error: "No driver row for this user" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const [, locInsert] = await Promise.all([
    admin
      .from("drivers")
      .update({
        current_lat: v.data.lat,
        current_lng: v.data.lng,
        last_location_update: now,
      })
      .eq("id", driver.id),
    admin.from("driver_locations").insert({
      driver_id: driver.id,
      lat: v.data.lat,
      lng: v.data.lng,
      accuracy: v.data.accuracy ?? null,
      speed: v.data.speed ?? null,
      heading: v.data.heading ?? null,
      battery_level: v.data.battery ?? null,
      recorded_at: now,
    }),
  ]);

  if (locInsert.error) {
    return NextResponse.json({ error: locInsert.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recordedAt: now });
}
