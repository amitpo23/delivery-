import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

const Body = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(10),
  /** Anonymous /track viewers can subscribe under their phone instead of a user_id. */
  phone: z.string().min(2).max(40).optional(),
  userAgent: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`push-sub:${getRequestIp(req)}`, { max: 30, refillPerMinute: 30 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  // Resolve audience: prefer the authenticated user's id; fall back to a
  // phone-bound row when the caller is anonymous (a /track viewer).
  const session = await createServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user && !v.data.phone) {
    return NextResponse.json(
      { error: "Either an authenticated session or a phone is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user?.id ?? null,
        phone: !user ? v.data.phone ?? null : null,
        endpoint: v.data.endpoint,
        p256dh: v.data.p256dh,
        auth: v.data.auth,
        user_agent: v.data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    )
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export async function DELETE(req: Request) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = z.object({ endpoint: z.string().url() }).safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", v.data.endpoint);
  return NextResponse.json({ ok: true });
}
