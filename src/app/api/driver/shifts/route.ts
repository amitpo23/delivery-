import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (!driver) return NextResponse.json({ shifts: [], current: null });

  const { data, error } = await admin
    .from("driver_shifts")
    .select("id, started_at, ended_at, total_minutes")
    .eq("driver_id", driver.id)
    .order("started_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const current = (data ?? []).find((s) => s.ended_at === null) ?? null;
  return NextResponse.json({ shifts: data ?? [], current });
}
