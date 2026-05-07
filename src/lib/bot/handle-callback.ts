import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/types";
import {
  decodeCallback,
  DRIVER_ACTION_TO_STATUS,
  type DriverAction,
} from "./callback";
import { isDriverTransitionAllowed } from "@/lib/orders/transitions";
import { sendTelegramMessage } from "./telegram-send";

/**
 * Outcome of processing a Telegram callback_query from a driver.
 *
 * `status` semantics:
 *   - "processed" — order updated (or, for "issue", a ticket was opened).
 *   - "rejected"  — caller-visible reason (invalid data, wrong driver, illegal
 *                   transition, no such order). The handler still records the
 *                   attempt to bot_callback_log so we can investigate later.
 *   - "duplicate" — same callback_id seen before (Telegram retry). Idempotent
 *                   no-op; we already replied the first time.
 *   - "error"     — unexpected DB error. Caller should answer the callback
 *                   with a generic "try again" message.
 *
 * `ack` is the short toast (≤200 chars) we want shown to the driver on tap.
 */
export interface CallbackOutcome {
  status: "processed" | "rejected" | "duplicate" | "error";
  ack: string;
  newStatus?: OrderStatus;
  orderId?: string;
  reason?: string;
}

export interface CallbackInput {
  callbackId: string;
  chatId: string;
  data: string;
  raw?: unknown;
}

/**
 * Handle a driver's tap on an inline button. Steps:
 *   1. Decode callback_data → orderId + action.
 *   2. Idempotency: insert into bot_callback_log; PK clash means we've seen
 *      this callback_id before, return "duplicate".
 *   3. Look up the driver by chat_id (drivers.telegram_chat_id, fallback to
 *      profiles.telegram_chat_id of the linked user). Reject if no match.
 *   4. Load the order, verify it's currently assigned to this driver and the
 *      requested transition is legal.
 *   5. Update orders.status (the existing webhook trigger then fires the next
 *      notification → driver gets the next keyboard, customer gets ETA, etc).
 *   6. Patch the bot_callback_log row with the outcome.
 *
 * Note on race conditions: two simultaneous taps on the same button produce
 * two callback_ids, so step 2 doesn't dedupe them. Step 4 dedupes via the
 * status precondition (the second tap sees the post-update status and the
 * transition is no longer allowed).
 */
export async function handleDriverCallback(
  input: CallbackInput,
  supabase: SupabaseClient,
): Promise<CallbackOutcome> {
  const decoded = decodeCallback(input.data);
  if (!decoded) {
    await recordCallback(supabase, {
      ...input,
      orderId: null,
      driverId: null,
      action: input.data.slice(0, 32),
      status: "rejected",
      reason: "invalid_data",
    });
    return { status: "rejected", ack: "פעולה לא חוקית", reason: "invalid_data" };
  }

  const { orderId, action } = decoded;

  // Idempotency: try to claim the callback_id. If it's a duplicate, bail.
  const claim = await claimCallback(supabase, {
    callbackId: input.callbackId,
    chatId: input.chatId,
    orderId,
    action,
    raw: input.raw,
  });
  if (claim === "duplicate") {
    return {
      status: "duplicate",
      ack: "הפעולה כבר נרשמה",
      orderId,
      reason: "duplicate",
    };
  }
  if (claim === "error") {
    return {
      status: "error",
      ack: "שגיאת מערכת. נסו שוב.",
      orderId,
      reason: "claim_failed",
    };
  }

  const driverId = await resolveDriverId(supabase, input.chatId);
  if (!driverId) {
    await finalizeCallback(supabase, input.callbackId, {
      driverId: null,
      status: "rejected",
      reason: "unknown_driver",
    });
    return {
      status: "rejected",
      ack: "המספר הזה לא רשום כנהג.",
      orderId,
      reason: "unknown_driver",
    };
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status, driver_id, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    await finalizeCallback(supabase, input.callbackId, {
      driverId,
      status: "rejected",
      reason: orderErr ? "order_lookup_failed" : "order_not_found",
    });
    return {
      status: "rejected",
      ack: "הזמנה לא נמצאה.",
      orderId,
      reason: "order_not_found",
    };
  }

  const orderRow = order as {
    id: string;
    status: OrderStatus;
    driver_id: string | null;
    order_number: string;
  };

  if (orderRow.driver_id !== driverId) {
    await finalizeCallback(supabase, input.callbackId, {
      driverId,
      status: "rejected",
      reason: "not_assigned_driver",
    });
    return {
      status: "rejected",
      ack: "ההזמנה לא משובצת אליך.",
      orderId,
      reason: "not_assigned_driver",
    };
  }

  if (action === "issue") {
    // Issue path: no status flip. We fan-out a Telegram alert to every admin
    // chat that's connected, so the dispatcher sees the report immediately
    // even though we haven't built the full ticket UI yet.
    await notifyAdminsOfIssue(supabase, {
      orderNumber: orderRow.order_number,
      driverId,
    });
    await finalizeCallback(supabase, input.callbackId, {
      driverId,
      status: "processed",
      reason: "issue_reported",
    });
    return {
      status: "processed",
      ack: "סומן כבעיה. המוקד יחזור אליך.",
      orderId,
      reason: "issue_reported",
    };
  }

  const targetStatus = DRIVER_ACTION_TO_STATUS[action];
  if (!isDriverTransitionAllowed(orderRow.status, targetStatus)) {
    await finalizeCallback(supabase, input.callbackId, {
      driverId,
      status: "rejected",
      reason: `illegal_transition:${orderRow.status}->${targetStatus}`,
    });
    return {
      status: "rejected",
      ack: `לא ניתן לעבור ל-${targetStatus} מ-${orderRow.status}`,
      orderId,
      reason: "illegal_transition",
    };
  }

  const updates: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderRow.id)
    .eq("driver_id", driverId)
    .eq("status", orderRow.status);

  if (updateErr) {
    await finalizeCallback(supabase, input.callbackId, {
      driverId,
      status: "error",
      reason: `update_failed:${updateErr.message}`,
    });
    return {
      status: "error",
      ack: "עדכון נכשל. נסו שוב.",
      orderId,
      reason: "update_failed",
    };
  }

  // Insert a status_history row alongside so the timeline reflects the
  // driver-initiated event with attribution. Best-effort — the order is
  // already updated, this is just denormalized history.
  await supabase.from("order_status_history").insert({
    order_id: orderRow.id,
    status: targetStatus,
    notes: `דרך הבוט: ${action}`,
  });

  await finalizeCallback(supabase, input.callbackId, {
    driverId,
    status: "processed",
    reason: `${orderRow.status}->${targetStatus}`,
  });

  return {
    status: "processed",
    ack: ackForAction(action, orderRow.order_number),
    newStatus: targetStatus,
    orderId,
  };
}

function ackForAction(action: DriverAction, orderNumber: string): string {
  switch (action) {
    case "pickup":
      return `סומן כנאסף #${orderNumber}`;
    case "transit":
      return `בדרך ללקוח #${orderNumber}`;
    case "deliver":
      return `סומן כנמסר #${orderNumber}`;
    case "return":
      return `סומן כהוחזר #${orderNumber}`;
    case "issue":
      return `סומן כבעיה #${orderNumber}`;
  }
}

/**
 * Look up the driver row whose Telegram chat_id matches. Two locations: the
 * `drivers.telegram_chat_id` column (preferred), and a fallback via
 * `profiles.telegram_chat_id` of the linked user. Returns null if neither
 * matches.
 */
async function resolveDriverId(
  supabase: SupabaseClient,
  chatId: string,
): Promise<string | null> {
  const { data: byDriver } = await supabase
    .from("drivers")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (byDriver) return (byDriver as { id: string }).id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("role", "driver")
    .maybeSingle();
  if (!profile) return null;

  const { data: byUser } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", (profile as { id: string }).id)
    .maybeSingle();
  return byUser ? (byUser as { id: string }).id : null;
}

interface ClaimInput {
  callbackId: string;
  chatId: string;
  orderId: string;
  action: DriverAction;
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
    status: "rejected", // placeholder — finalizeCallback patches it
    reason: "in_flight",
    raw: input.raw ?? null,
  });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  return "error";
}

interface RecordInput {
  callbackId: string;
  chatId: string;
  orderId: string | null;
  driverId: string | null;
  action: string;
  status: "processed" | "rejected" | "error";
  reason: string;
  raw?: unknown;
}

async function recordCallback(
  supabase: SupabaseClient,
  input: RecordInput,
): Promise<void> {
  await supabase.from("bot_callback_log").insert({
    callback_id: input.callbackId,
    channel: "telegram",
    chat_id: input.chatId,
    order_id: input.orderId,
    driver_id: input.driverId,
    action: input.action,
    status: input.status,
    reason: input.reason,
    raw: input.raw ?? null,
  });
}

/**
 * Best-effort fan-out of "issue reported" to every admin whose
 * profiles.telegram_chat_id is populated. Failures are swallowed — the
 * caller has already promised the driver "סומן כבעיה" and we don't want
 * a downed admin chat to abort that.
 */
async function notifyAdminsOfIssue(
  supabase: SupabaseClient,
  ctx: { orderNumber: string; driverId: string },
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("role", "admin")
    .not("telegram_chat_id", "is", null);

  const chatIds = ((data as { telegram_chat_id: string | null }[] | null) ?? [])
    .map((r) => r.telegram_chat_id)
    .filter((v): v is string => Boolean(v));

  const text = `⚠️ דווחה בעיה במשלוח\nהזמנה #${ctx.orderNumber}\nנהג: ${ctx.driverId}\nיש לבדוק במערכת.`;
  await Promise.all(
    chatIds.map((chatId) =>
      sendTelegramMessage(chatId, text).catch((err) => {
        console.error("[bot] admin issue notify failed", { chatId, err });
      }),
    ),
  );
}

async function finalizeCallback(
  supabase: SupabaseClient,
  callbackId: string,
  patch: { driverId: string | null; status: "processed" | "rejected" | "error"; reason: string },
): Promise<void> {
  await supabase
    .from("bot_callback_log")
    .update({
      driver_id: patch.driverId,
      status: patch.status,
      reason: patch.reason,
    })
    .eq("callback_id", callbackId);
}
