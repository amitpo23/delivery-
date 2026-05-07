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
      publicSiteUrl: process.env.PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined,
    },
    admin
  );

  // Visibility — every transition leaves a structured log line in Vercel.
  // Before this, a misconfigured Vault secret or missing telegram_chat_id
  // surfaced as silent zero — operators couldn't tell if the trigger was
  // firing at all. With these lines, "0 sent / N planned" is unambiguous
  // and points at the right layer (lookup, sender, or downstream).
  const newRow = (p.record ?? null) as OrderRow | null;
  console.log("[notifications.dispatch]", {
    op: p.type,
    orderId: newRow?.id ?? null,
    orderNumber: newRow?.order_number ?? null,
    status: newRow?.status ?? null,
    planned: outcome.planned,
    sent: outcome.sent,
    skipped: outcome.skipped,
    failed: outcome.failed,
  });
  if (outcome.failed > 0) {
    console.error("[notifications.dispatch] failures", {
      orderId: newRow?.id ?? null,
      details: outcome.details.filter((d) => d.status === "failed"),
    });
  }

  // Web Push fan-out — best-effort, additive to telegram/whatsapp.
  // Only fires on real status transitions so an UPDATE that changes notes
  // doesn't spam every device watching the page.
  const oldRow = (p.old_record ?? null) as OrderRow | null;
  const transitioned =
    newRow &&
    (p.type === "INSERT" || (p.type === "UPDATE" && oldRow?.status !== newRow.status));

  if (transitioned && newRow?.booker_phone) {
    try {
      const { sendPush } = await import("@/lib/push/send");
      await sendPush({
        audience: { phone: newRow.booker_phone },
        payload: {
          title: "עדכון על המשלוח שלך",
          body: `הזמנה ${newRow.order_number} — סטטוס: ${newRow.status}`,
          url: `/track/${newRow.order_number}`,
        },
      });
    } catch (err) {
      console.error("[push] dispatch fan-out failed", err);
    }
  }

  return NextResponse.json({ ok: true, outcome });
}
