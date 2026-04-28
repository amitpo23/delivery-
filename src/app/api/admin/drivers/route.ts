import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select(
      `id, status, vehicle_type, zone_id,
       profile:profiles!drivers_user_id_fkey(full_name, phone),
       zone:zones(name)`,
    )
    .neq("status", "offline")
    .order("status", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drivers: data ?? [] });
}
