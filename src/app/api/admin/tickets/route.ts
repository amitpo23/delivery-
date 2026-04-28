import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketNumber } from "@/lib/tickets/numbers";

const CreateBody = z.object({
  customerId: z.string().uuid().optional(),
  customerPhone: z.string().min(2).max(40).optional(),
  orderId: z.string().uuid().optional(),
  subject: z.string().min(2).max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export async function GET(req: Request) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const assigned = url.searchParams.get("assigned");

  const admin = createAdminClient();
  let q = admin
    .from("tickets")
    .select(
      `id, ticket_number, status, priority, source, subject, description,
       customer_id, customer_phone, order_id, assigned_to, created_at,
       updated_at, resolved_at,
       order:orders(order_number, status),
       assignee:profiles!tickets_assigned_to_fkey(full_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) q = q.eq("status", status);
  if (assigned === "me") q = q.eq("assigned_to", guard.user.id);
  if (assigned === "unassigned") q = q.is("assigned_to", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = CreateBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tickets")
    .insert({
      ticket_number: generateTicketNumber(),
      customer_id: v.data.customerId ?? null,
      customer_phone: v.data.customerPhone ?? null,
      order_id: v.data.orderId ?? null,
      subject: v.data.subject,
      description: v.data.description ?? null,
      priority: v.data.priority,
      source: "manual",
      created_by: guard.user.id,
    })
    .select("id, ticket_number, status, priority, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
