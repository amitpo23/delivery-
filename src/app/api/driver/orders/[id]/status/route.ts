import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDriverTransitionAllowed } from "@/lib/orders/transitions";
import type { OrderStatus } from "@/types";

const Body = z.object({
  status: z.enum([
    "picked_up",
    "in_transit",
    "delivered",
    "cancelled",
    "returned",
  ]),
  notes: z.string().max(1000).optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["driver", "admin"]);
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
  const target = v.data.status;

  const admin = createAdminClient();

  const { data: order, error: readErr } = await admin
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Driver may only act on orders assigned to themself. Admin bypasses
  // ownership but still must obey the transition table.
  if (guard.role === "driver") {
    const { data: driver } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    if (!driver || driver.id !== order.driver_id) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }
  }

  if (!isDriverTransitionAllowed(order.status as OrderStatus, target)) {
    return NextResponse.json(
      { error: `Illegal transition: ${order.status} → ${target}` },
      { status: 409 },
    );
  }

  // 'delivered' is reserved for the POD endpoint — we want photo/signature
  // alongside the status flip, so funnel it through there only.
  if (target === "delivered") {
    return NextResponse.json(
      { error: "Use POST /api/driver/orders/:id/deliver to mark delivered" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({ status: target })
    .eq("id", id)
    .eq("status", order.status) // optimistic concurrency vs another transition mid-flight
    .select("id, status")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: "Order changed concurrently — refresh and retry" },
      { status: 409 },
    );
  }

  await admin.from("order_status_history").insert({
    order_id: id,
    status: target,
    notes: v.data.notes ?? `Status changed to ${target} by ${guard.role}`,
  });

  return NextResponse.json({ order: updated });
}
