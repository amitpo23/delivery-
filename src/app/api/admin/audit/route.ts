import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);

  const admin = createAdminClient();
  let q = admin
    .from("audit_log")
    .select("id, actor_email, actor_role, action, target_type, target_id, before, after, meta, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (targetType) q = q.eq("target_type", targetType);
  if (targetId) q = q.eq("target_id", targetId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}
