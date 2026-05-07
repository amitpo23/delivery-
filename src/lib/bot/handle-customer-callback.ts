import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/types";
import {
  decodeAnyCallback,
  CUSTOMER_CANCELLABLE_STATUSES,
  customerKeyboardForStatus,
  type CustomerAction,
} from "./callback";
import { buildTrackingCard } from "./customer-tracking";

/**
 * Outcome of a customer callback (a tap from a customer-facing inline button).
 *
 * Unlike the driver flow, customer callbacks don't all mutate state:
 *   - "refresh" / "chat" — read-only, just a different reply.
 *   - "cancel"           — mutates only on phone match.
 *
 * `replyText` is what we send next to the customer's chat (separate from
 * `ack`, which is the small toast at the top of the chat).
 */
export interface CustomerCallbackOutcome {
  status: "processed" | "rejected" | "duplicate" | "error";
  ack: string;
  replyText?: string;
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
  reason?: string;
}

export interface CustomerCallbackInput {
  callbackId: string;
  chatId: string;
  data: string;
  /**
   * Telegram contact info attached to the user, if any. Currently we don't
   * read it (Telegram only exposes the contact when the user explicitly
   * shares it via a "send contact" button). Reserved for future phone-match
   * verification on `cancel`.
   */
  contactPhone?: string | null;
  publicSiteUrl?: string;
  raw?: unknown;
}

/**
 * Top-level entry. The webhook calls this for any callback whose
 * decodeAnyCallback().kind === "customer".
 */
export async function handleCustomerCallback(
  input: CustomerCallbackInput,
  supabase: SupabaseClient,
): Promise<CustomerCallbackOutcome> {
  const decoded = decodeAnyCallback(input.data);
  if (!decoded || decoded.kind !== "customer") {
    return { status: "rejected", ack: "פעולה לא חוקית", reason: "invalid_data" };
  }

  // Idempotency: same as driver path but tagged as customer-channel.
  const claim = await claimCallback(supabase, {
    callbackId: input.callbackId,
    chatId: input.chatId,
    orderId: decoded.orderId,
    action: decoded.action,
    raw: input.raw,
  });
  if (claim === "duplicate") {
    return {
      status: "duplicate",
      ack: "הפעולה כבר נרשמה",
      reason: "duplicate",
    };
  }
  if (claim === "error") {
    return { status: "error", ack: "שגיאת מערכת. נסו שוב.", reason: "claim_failed" };
  }

  switch (decoded.action) {
    case "refresh":
      return await handleRefresh(decoded.orderId, input.callbackId, supabase);
    case "chat":
      return await handleChat(decoded.orderId, input.callbackId, input.publicSiteUrl, supabase);
    case "cancel":
      return await handleCancel(decoded.orderId, input.callbackId, input.chatId, supabase);
  }
}

async function handleRefresh(
  orderId: string,
  callbackId: string,
  supabase: SupabaseClient,
): Promise<CustomerCallbackOutcome> {
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (!data) {
    await finalize(supabase, callbackId, "rejected", "order_not_found");
    return { status: "rejected", ack: "הזמנה לא נמצאה", reason: "order_not_found" };
  }

  const card = await buildTrackingCard((data as { order_number: string }).order_number, supabase);
  await finalize(supabase, callbackId, "processed", "refreshed");
  if (!card.found) {
    return { status: "rejected", ack: "הזמנה לא נמצאה", replyText: card.text };
  }
  return {
    status: "processed",
    ack: "מעודכן",
    replyText: card.text,
    replyMarkup: card.replyMarkup,
  };
}

async function handleChat(
  orderId: string,
  callbackId: string,
  publicSiteUrl: string | undefined,
  supabase: SupabaseClient,
): Promise<CustomerCallbackOutcome> {
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!data) {
    await finalize(supabase, callbackId, "rejected", "order_not_found");
    return { status: "rejected", ack: "הזמנה לא נמצאה", reason: "order_not_found" };
  }
  const orderNumber = (data as { order_number: string }).order_number;
  const base = publicSiteUrl ?? "";
  const replyText = base
    ? `📞 לפנייה למוקד:\n${base}/track/${orderNumber}\nניתן גם להתקשר לטלפון של החברה.`
    : `📞 לפנייה למוקד תיכנסו לעמוד המעקב של ההזמנה.`;
  await finalize(supabase, callbackId, "processed", "chat_link_sent");
  return { status: "processed", ack: "שלחנו לך קישור", replyText };
}

async function handleCancel(
  orderId: string,
  callbackId: string,
  chatId: string,
  supabase: SupabaseClient,
): Promise<CustomerCallbackOutcome> {
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .select("id, order_number, status, booker_phone, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !orderData) {
    await finalize(supabase, callbackId, "rejected", "order_not_found");
    return { status: "rejected", ack: "הזמנה לא נמצאה", reason: "order_not_found" };
  }

  const order = orderData as {
    id: string;
    order_number: string;
    status: OrderStatus;
    booker_phone: string | null;
    customer_id: string | null;
  };

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    await finalize(supabase, callbackId, "rejected", `not_cancellable:${order.status}`);
    return {
      status: "rejected",
      ack: "לא ניתן לבטל בשלב זה",
      replyText: `לא ניתן לבטל הזמנה במצב "${order.status}". פנה למוקד.`,
      reason: "not_cancellable",
    };
  }

  const ownership = await verifyCustomerOwnership({ chatId, order, supabase });
  if (!ownership.ok) {
    await finalize(supabase, callbackId, "rejected", `ownership:${ownership.reason}`);
    return {
      status: "rejected",
      ack: "אנו לא יכולים לאמת את זהותך",
      replyText:
        "ביטול הזמנה אפשרי רק מהחשבון שביצע אותה. שלחו /connect <מספר טלפון> או צרו קשר עם המוקד.",
      reason: ownership.reason,
    };
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "cancelled", cancellation_reason: "ביטול ע״י לקוח דרך הבוט" })
    .eq("id", order.id)
    .eq("status", order.status);

  if (updateErr) {
    await finalize(supabase, callbackId, "error", `update_failed:${updateErr.message}`);
    return { status: "error", ack: "ביטול נכשל. נסה שוב.", reason: "update_failed" };
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "cancelled",
    notes: "ביטול ע״י לקוח דרך הבוט",
  });

  await finalize(supabase, callbackId, "processed", "cancelled_by_customer");

  // After cancellation, status changes to a non-cancellable one. Re-render the
  // card so the customer sees the new state and the cancel button is gone.
  const card = await buildTrackingCard(order.order_number, supabase);
  return {
    status: "processed",
    ack: "ההזמנה בוטלה",
    replyText: card.found ? card.text : `הזמנה #${order.order_number} בוטלה.`,
    replyMarkup: card.found
      ? card.replyMarkup
      : customerKeyboardForStatus(order.id, "cancelled"),
  };
}

interface OwnershipResult {
  ok: boolean;
  reason?: string;
}

/**
 * Cancel must be authorized. We accept either:
 *   1. The Telegram chat is bound (via /connect) to a profile whose
 *      profiles.id matches order.customer_id.
 *   2. The Telegram chat is bound to a profile whose profiles.phone equals
 *      order.booker_phone (covers anon bookings tied later to a profile).
 *
 * Anything else falls through to "rejected" — even if the user knows the
 * tracking number. Tracking numbers leak (forwarded WhatsApp, screenshots),
 * so they aren't a credential.
 */
async function verifyCustomerOwnership(args: {
  chatId: string;
  order: { customer_id: string | null; booker_phone: string | null };
  supabase: SupabaseClient;
}): Promise<OwnershipResult> {
  const { data } = await args.supabase
    .from("profiles")
    .select("id, phone")
    .eq("telegram_chat_id", args.chatId)
    .maybeSingle();

  if (!data) {
    return { ok: false, reason: "chat_not_bound" };
  }
  const p = data as { id: string; phone: string | null };

  if (args.order.customer_id && p.id === args.order.customer_id) {
    return { ok: true };
  }
  if (args.order.booker_phone && p.phone && phonesMatch(p.phone, args.order.booker_phone)) {
    return { ok: true };
  }
  return { ok: false, reason: "phone_mismatch" };
}

function phonesMatch(a: string, b: string): boolean {
  const norm = (s: string) => {
    const digits = s.replace(/[^\d]/g, "");
    if (digits.startsWith("972")) return digits;
    if (digits.startsWith("0")) return "972" + digits.slice(1);
    return digits;
  };
  return norm(a) === norm(b);
}

interface ClaimInput {
  callbackId: string;
  chatId: string;
  orderId: string;
  action: CustomerAction;
  raw?: unknown;
}

async function claimCallback(
  supabase: SupabaseClient,
  input: ClaimInput,
): Promise<"claimed" | "duplicate" | "error"> {
  const { error } = await supabase.from("bot_callback_log").insert({
    callback_id: input.callbackId,
    channel: "telegram",
    chat_id: input.chatId,
    order_id: input.orderId,
    action: input.action,
    status: "rejected", // placeholder — finalize() patches it
    reason: "in_flight",
    raw: input.raw ?? null,
  });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  return "error";
}

async function finalize(
  supabase: SupabaseClient,
  callbackId: string,
  status: "processed" | "rejected" | "error",
  reason: string,
): Promise<void> {
  await supabase
    .from("bot_callback_log")
    .update({ status, reason })
    .eq("callback_id", callbackId);
}
