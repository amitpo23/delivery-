import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const PatchBody = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  resolution: z.string().max(4000).nullable().optional(),
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [ticketRes, commentsRes] = await Promise.all([
    admin
      .from("tickets")
      .select(
        `id, ticket_number, status, priority, source, subject, description,
         customer_id, customer_phone, order_id, assigned_to, resolution,
         created_at, updated_at, resolved_at,
         order:orders(order_number, status, pickup_address, delivery_address),
         assignee:profiles!tickets_assigned_to_fkey(full_name),
         creator:profiles!tickets_created_by_fkey(full_name)`,
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("ticket_comments")
      .select(
        `id, body, is_internal, created_at,
         author:profiles!ticket_comments_author_id_fkey(full_name)`,
      )
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketRes.error) return NextResponse.json({ error: ticketRes.error.message }, { status: 500 });
  if (!ticketRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ticket: ticketRes.data,
    comments: commentsRes.data ?? [],
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

  const update: Record<string, unknown> = {};
  if (v.data.status !== undefined) {
    update.status = v.data.status;
    // Stamp resolved_at on first transition into resolved/closed; clear if
    // the dispatcher reopens.
    if (v.data.status === "resolved" || v.data.status === "closed") {
      update.resolved_at = new Date().toISOString();
    } else {
      update.resolved_at = null;
    }
  }
  if (v.data.priority !== undefined) update.priority = v.data.priority;
  if (v.data.assignedTo !== undefined) update.assigned_to = v.data.assignedTo;
  if (v.data.resolution !== undefined) update.resolution = v.data.resolution;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tickets")
    .update(update)
    .eq("id", id)
    .select("id, status, priority, assigned_to, resolution, resolved_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
