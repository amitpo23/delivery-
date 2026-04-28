import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const PatchBody = z.object({
  notes: z.string().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const admin = createAdminClient();

  // Guest aggregate path: id starts with "guest:<phone>" → no customer row,
  // synthesize the response from orders + manual_messages keyed on phone.
  if (id.startsWith("guest:")) {
    const phone = id.slice("guest:".length);
    const [ordersRes, messagesRes] = await Promise.all([
      admin
        .from("orders")
        .select(
          "id, order_number, status, service_type, pickup_address, delivery_address, estimated_price, final_price, created_at, delivered_at",
        )
        .eq("booker_phone", phone)
        .order("created_at", { ascending: false }),
      admin
        .from("manual_messages")
        .select("id, channel, body, status, created_at, sent_at")
        .eq("recipient", phone)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (ordersRes.error) {
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    }
    return NextResponse.json({
      customer: {
        id,
        is_guest: true,
        full_name: ordersRes.data?.[0]?.id
          ? "אורח"
          : "אורח",
        phone,
        notes: null,
        tags: [],
        customer_type: "guest",
        company_name: null,
      },
      orders: ordersRes.data ?? [],
      messages: messagesRes.data ?? [],
    });
  }

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [customerRes, ordersRes, messagesRes] = await Promise.all([
    admin
      .from("customers")
      .select(
        `id, customer_type, company_name, notes, tags, created_at,
         profile:profiles!customers_user_id_fkey(full_name, phone)`,
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("orders")
      .select(
        "id, order_number, status, service_type, pickup_address, delivery_address, estimated_price, final_price, created_at, delivered_at",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("manual_messages")
      .select("id, channel, body, status, created_at, sent_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (customerRes.error) {
    return NextResponse.json({ error: customerRes.error.message }, { status: 500 });
  }
  if (!customerRes.data) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const c = customerRes.data;
  const profile = (Array.isArray(c.profile) ? c.profile[0] : c.profile) as
    | { full_name: string; phone: string }
    | null;

  return NextResponse.json({
    customer: {
      id: c.id,
      is_guest: false,
      full_name: profile?.full_name ?? "—",
      phone: profile?.phone ?? "",
      notes: c.notes,
      tags: (c.tags as string[]) ?? [],
      customer_type: c.customer_type,
      company_name: c.company_name,
    },
    orders: ordersRes.data ?? [],
    messages: messagesRes.data ?? [],
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = PatchBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const update: { notes?: string | null; tags?: string[] } = {};
  if (v.data.notes !== undefined) update.notes = v.data.notes;
  if (v.data.tags !== undefined) update.tags = v.data.tags;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .update(update)
    .eq("id", id)
    .select("id, notes, tags")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customer: data });
}
