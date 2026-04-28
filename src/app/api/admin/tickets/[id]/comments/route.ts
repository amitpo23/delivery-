import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  body: z.string().min(1).max(4000),
  isInternal: z.boolean().optional().default(true),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
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
  const { data, error } = await admin
    .from("ticket_comments")
    .insert({
      ticket_id: id,
      author_id: guard.user.id,
      body: v.data.body,
      is_internal: v.data.isInternal,
    })
    .select(
      `id, body, is_internal, created_at,
       author:profiles!ticket_comments_author_id_fkey(full_name)`,
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Touch the parent ticket so the list view's updated_at moves to now.
  await admin
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ comment: data });
}
