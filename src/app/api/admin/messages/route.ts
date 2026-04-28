import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/bot/telegram-send";
import { sendWhatsAppMessage } from "@/lib/bot/whatsapp-send";

const Body = z.object({
  customerId: z.string().optional(),
  recipient: z.string().min(2).max(80),
  channel: z.enum(["whatsapp", "telegram"]),
  body: z.string().min(1).max(4000),
  orderId: z.string().uuid().optional(),
});

/**
 * Manually send a one-off message to a customer from the admin UI. Logs
 * to manual_messages either way (sent or failed) so the conversation
 * thread on /admin/customers/[id] is consistent.
 */
export async function POST(req: Request) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

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

  let status: "sent" | "failed" = "sent";
  let failureReason: string | null = null;

  try {
    if (v.data.channel === "telegram") {
      await sendTelegramMessage(v.data.recipient, v.data.body);
    } else {
      await sendWhatsAppMessage(v.data.recipient, v.data.body);
    }
  } catch (err) {
    status = "failed";
    failureReason = err instanceof Error ? err.message : String(err);
  }

  const { data: logged, error: logErr } = await admin
    .from("manual_messages")
    .insert({
      customer_id: v.data.customerId ?? null,
      recipient: v.data.recipient,
      channel: v.data.channel,
      body: v.data.body,
      status,
      failure_reason: failureReason,
      sent_by: guard.user.id,
      order_id: v.data.orderId ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .select("id, status")
    .maybeSingle();

  if (logErr) {
    return NextResponse.json(
      { error: `Send ${status} but log failed: ${logErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: logged, status, failureReason },
    { status: status === "sent" ? 200 : 502 },
  );
}
