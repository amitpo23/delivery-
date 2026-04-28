import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (!driver) return NextResponse.json({ error: "Not a driver" }, { status: 404 });

  const { data: open } = await admin
    .from("driver_shifts")
    .select("id, started_at")
    .eq("driver_id", driver.id)
    .is("ended_at", null)
    .maybeSingle();
  if (!open) return NextResponse.json({ error: "אין משמרת פתוחה" }, { status: 409 });

  const now = new Date();
  const minutes = Math.round((now.getTime() - new Date(open.started_at).getTime()) / 60_000);

  const { data, error } = await admin
    .from("driver_shifts")
    .update({ ended_at: now.toISOString(), total_minutes: minutes })
    .eq("id", open.id)
    .select("id, started_at, ended_at, total_minutes")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flip the driver back to offline so the admin map clears them.
  await admin.from("drivers").update({ status: "offline" }).eq("id", driver.id);

  return NextResponse.json({ shift: data });
}
