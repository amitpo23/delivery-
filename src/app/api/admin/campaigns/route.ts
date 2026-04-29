import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience } from "@/lib/campaigns/audience";

const FilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  minOrders: z.number().int().nonnegative().optional(),
  maxDaysSinceLast: z.number().int().nonnegative().optional(),
});

const CreateBody = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  bodyText: z.string().min(2),
  bodyHtml: z.string().optional(),
  audienceFilter: FilterSchema.default({}),
});

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireRole(["admin"]);
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

  // Surface the recipient count up front so the dispatcher can sanity-check
  // the filter before pressing Send. Cheap because we already need the
  // resolved list when send fires.
  const audience = await resolveAudience(v.data.audienceFilter);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_campaigns")
    .insert({
      name: v.data.name,
      subject: v.data.subject,
      body_text: v.data.bodyText,
      body_html: v.data.bodyHtml ?? null,
      audience_filter: v.data.audienceFilter,
      recipients_count: audience.length,
      created_by: guard.user.id,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data, audienceCount: audience.length });
}
