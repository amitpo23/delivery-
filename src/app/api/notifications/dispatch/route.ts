import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchOrderEvent, type OrderRow } from "@/lib/notifications/dispatcher";

const RowSchema = z
  .object({
    id: z.string().uuid(),
    order_number: z.string(),
    status: z.string(),
    driver_id: z.string().uuid().nullable(),
    pickup_address: z.string(),
    delivery_address: z.string(),
    booker_phone: z.string().nullable().optional(),
    cancellation_reason: z.string().nullable().optional(),
  })
  .passthrough();

const PayloadSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  record: RowSchema.nullable().optional(),
  old_record: RowSchema.nullable().optional(),
});

function authorized(req: Request): boolean {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!expected) return false;
  const got = req.headers.get("authorization");
  // Accept "Bearer <token>" or raw token (Supabase webhooks send the raw header).
  if (!got) return false;
  return got === expected || got === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }
  const p = parsed.data;
  if (p.table !== "orders") {
    return NextResponse.json({ ok: true, ignored: `table:${p.table}` });
  }

  const admin = createAdminClient();
  const outcome = await dispatchOrderEvent(
    {
      type: p.type,
      newRow: (p.record ?? null) as OrderRow | null,
      oldRow: (p.old_record ?? null) as OrderRow | null,
      publicSiteUrl: process.env.PUBLIC_SITE_URL ?? undefined,
    },
    admin
  );

  return NextResponse.json({ ok: true, outcome });
}
