import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  driverId: z.string().uuid(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
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

  // Atomic assign: only succeeds if the order is currently unassigned. The
  // .eq("driver_id", null) clause maps to `driver_id IS NULL` in PostgREST,
  // so a parallel admin who already won the race gets 0 rows back here and
  // we surface a 409 instead of silently overwriting their assignment.
  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({ driver_id: v.data.driverId, status: "assigned" })
    .eq("id", id)
    .is("driver_id", null)
    .in("status", ["pending", "confirmed"])
    .select("id, order_number, driver_id, status")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    // Either order doesn't exist, or it's already assigned, or it's in a
    // terminal state. Read once more so the client sees the current truth.
    const { data: current } = await admin
      .from("orders")
      .select("id, status, driver_id")
      .eq("id", id)
      .maybeSingle();
    return NextResponse.json(
      { error: "Order is no longer assignable", current },
      { status: 409 },
    );
  }

  await admin.from("order_status_history").insert({
    order_id: id,
    status: "assigned",
    notes: `Assigned by ${guard.user.email ?? guard.user.id} to driver ${v.data.driverId}`,
  });

  return NextResponse.json({ order: updated });
}
