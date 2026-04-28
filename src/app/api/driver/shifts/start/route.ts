import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id, status")
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (!driver) return NextResponse.json({ error: "Not a driver" }, { status: 404 });

  // Caught here for a friendly message; the unique partial index from
  // migration 016 also enforces it at DB level.
  const { data: open } = await admin
    .from("driver_shifts")
    .select("id")
    .eq("driver_id", driver.id)
    .is("ended_at", null)
    .maybeSingle();
  if (open) {
    return NextResponse.json({ error: "כבר יש משמרת פתוחה" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("driver_shifts")
    .insert({ driver_id: driver.id })
    .select("id, started_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flip driver status to available so admin live map picks them up.
  if (driver.status === "offline") {
    await admin.from("drivers").update({ status: "available" }).eq("id", driver.id);
  }

  return NextResponse.json({ shift: data });
}
