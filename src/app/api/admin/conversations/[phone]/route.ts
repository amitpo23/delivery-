import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns a unified conversation timeline for a single phone (or chat_id),
 * merging:
 *   - notification_log entries (status updates the system sent automatically)
 *   - manual_messages (an admin sent manually via /admin/customers/[id])
 *   - bot_sessions transitions (the bot's last known state — useful for
 *     debugging stuck conversations)
 *
 * Sorted oldest → newest because that's how a chat thread reads.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ phone: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { phone: rawPhone } = await context.params;
  const phone = decodeURIComponent(rawPhone);
  if (!phone || phone.length < 2) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Phone can come in many forms — bare digits, +972…, 050-…@c.us. Normalize
  // to digits-only and use a LIKE on each table so we catch all variants.
  const digits = phone.replace(/\D/g, "");
  const likeForms = [phone, `%${digits}%`];

  type Entry = {
    kind: "outgoing-auto" | "outgoing-manual" | "bot-state";
    channel: string;
    status: string | null;
    body: string;
    timestamp: string;
    meta?: Record<string, unknown>;
  };

  const entries: Entry[] = [];

  // 1) notification_log — outgoing system notifications
  const { data: notifs } = await admin
    .from("notification_log")
    .select("provider, recipient, template, payload, status, failure_reason, created_at, sent_at, order_id")
    .or(likeForms.map((f) => `recipient.ilike.${f}`).join(","))
    .order("created_at", { ascending: true })
    .limit(200);
  for (const n of notifs ?? []) {
    entries.push({
      kind: "outgoing-auto",
      channel: n.provider,
      status: n.status,
      body: `[${n.template}] ${JSON.stringify(n.payload)}`,
      timestamp: n.sent_at ?? n.created_at,
      meta: { failureReason: n.failure_reason, orderId: n.order_id },
    });
  }

  // 2) manual_messages — admin-sent
  const { data: manual } = await admin
    .from("manual_messages")
    .select("channel, recipient, body, status, failure_reason, created_at, sent_at, sent_by, order_id")
    .or(likeForms.map((f) => `recipient.ilike.${f}`).join(","))
    .order("created_at", { ascending: true })
    .limit(200);
  for (const m of manual ?? []) {
    entries.push({
      kind: "outgoing-manual",
      channel: m.channel,
      status: m.status,
      body: m.body,
      timestamp: m.sent_at ?? m.created_at,
      meta: { failureReason: m.failure_reason, orderId: m.order_id, sentBy: m.sent_by },
    });
  }

  // 3) bot_sessions — incoming/state side. We don't store individual user
  // messages (would need a separate audit table), but we can show the last
  // known state so the dispatcher knows where the user is in the flow.
  const { data: sessions } = await admin
    .from("bot_sessions")
    .select("channel, external_id, state, data, last_message_at, created_at, updated_at")
    .or(likeForms.map((f) => `external_id.ilike.${f}`).join(","))
    .order("created_at", { ascending: true })
    .limit(50);
  for (const s of sessions ?? []) {
    entries.push({
      kind: "bot-state",
      channel: s.channel,
      status: s.state,
      body: `שיחת בוט: שלב ${s.state}`,
      timestamp: s.updated_at ?? s.created_at,
      meta: { data: s.data },
    });
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return NextResponse.json({ phone, entries });
}
