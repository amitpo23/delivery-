import type { SupabaseClient } from "@supabase/supabase-js";
import { getSender } from "./index";
import type { Channel, NotificationRequest, NotificationTemplate } from "./types";

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  driver_id: string | null;
  pickup_address: string;
  delivery_address: string;
  booker_phone: string | null;
  cancellation_reason?: string | null;
}

export interface DispatchInput {
  type: "INSERT" | "UPDATE" | "DELETE";
  newRow: OrderRow | null;
  oldRow: OrderRow | null;
  publicSiteUrl?: string;
}

interface PlannedSend {
  channel: Channel;
  recipient: string;
  template: NotificationTemplate;
  eventId: string;
  payload: Record<string, string | number | null | undefined>;
}

export interface DispatchOutcome {
  planned: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    template: NotificationTemplate;
    channel: Channel;
    recipient: string;
    status: "sent" | "skipped" | "failed";
    failureReason?: string;
    externalId?: string;
  }>;
}

/**
 * Decides which notifications fire for a given orders-table change, then
 * sends them with idempotency. Pure function over the inputs + the supplied
 * supabase client (admin-role).
 */
export async function dispatchOrderEvent(
  input: DispatchInput,
  supabase: SupabaseClient
): Promise<DispatchOutcome> {
  const plans = await planSends(input, supabase);
  return await runPlans(plans, input.newRow?.id ?? null, supabase);
}

async function planSends(
  input: DispatchInput,
  supabase: SupabaseClient
): Promise<PlannedSend[]> {
  const order = input.newRow;
  if (!order) return [];

  const transitioned =
    input.type === "INSERT" ||
    (input.type === "UPDATE" && input.oldRow?.status !== order.status);
  if (!transitioned) return [];

  const trackingUrl = input.publicSiteUrl
    ? `${input.publicSiteUrl}/track/${order.order_number}`
    : `/track/${order.order_number}`;

  const sharedPayload = {
    orderNumber: order.order_number,
    pickupAddress: order.pickup_address,
    deliveryAddress: order.delivery_address,
    trackingUrl,
    cancelReason: order.cancellation_reason ?? "",
  };

  const adminChatIds = await fetchAdminTelegramIds(supabase);
  const driverChatId = order.driver_id ? await fetchDriverTelegramId(order.driver_id, supabase) : null;
  const customerPhone = order.booker_phone ?? null;

  const out: PlannedSend[] = [];
  const eventBase = `${order.id}:${order.status}`;

  function addAdmin(template: NotificationTemplate) {
    for (const chat of adminChatIds) {
      out.push({
        channel: "telegram",
        recipient: chat,
        template,
        eventId: `${eventBase}:admin:${chat}`,
        payload: sharedPayload,
      });
    }
  }
  function addDriver(template: NotificationTemplate) {
    if (!driverChatId) return;
    out.push({
      channel: "telegram",
      recipient: driverChatId,
      template,
      eventId: `${eventBase}:driver:${driverChatId}`,
      payload: sharedPayload,
    });
  }
  function addCustomer(template: NotificationTemplate) {
    if (!customerPhone) return;
    out.push({
      channel: "whatsapp",
      recipient: customerPhone,
      template,
      eventId: `${eventBase}:customer:${customerPhone}`,
      payload: sharedPayload,
    });
  }

  switch (order.status) {
    case "pending":
      if (input.type === "INSERT") {
        addCustomer("order.created");
        addAdmin("order.pending_admin_attention");
      }
      break;
    case "assigned":
      addCustomer("order.assigned.customer");
      addDriver("order.assigned.driver");
      break;
    case "picked_up":
      addCustomer("order.picked_up");
      break;
    case "delivered":
      addCustomer("order.delivered");
      break;
    case "cancelled":
      addCustomer("order.cancelled");
      addAdmin("order.cancelled");
      break;
    case "returned":
      addCustomer("order.returned");
      addAdmin("order.returned");
      break;
  }

  return out;
}

async function runPlans(
  plans: PlannedSend[],
  orderId: string | null,
  supabase: SupabaseClient
): Promise<DispatchOutcome> {
  const outcome: DispatchOutcome = {
    planned: plans.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const plan of plans) {
    const inserted = await insertLogIfNew(plan, orderId, supabase);
    if (inserted.duplicate) {
      outcome.skipped++;
      outcome.details.push({
        template: plan.template,
        channel: plan.channel,
        recipient: plan.recipient,
        status: "skipped",
        failureReason: "Already sent (idempotency)",
      });
      continue;
    }
    if (!inserted.id) {
      outcome.failed++;
      outcome.details.push({
        template: plan.template,
        channel: plan.channel,
        recipient: plan.recipient,
        status: "failed",
        failureReason: inserted.error ?? "notification_log insert failed",
      });
      continue;
    }

    const req: NotificationRequest = {
      template: plan.template,
      recipient: plan.recipient,
      channel: plan.channel,
      payload: plan.payload,
      eventId: plan.eventId,
      orderId: orderId ?? undefined,
    };

    let result;
    try {
      result = await getSender(plan.channel).send(req);
    } catch (err) {
      result = {
        ok: false,
        failureReason: err instanceof Error ? err.message : "Sender threw",
      };
    }

    await supabase
      .from("notification_log")
      .update({
        status: result.ok ? "sent" : "failed",
        external_id: result.externalId ?? null,
        failure_reason: result.failureReason ?? null,
        attempts: 1,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq("id", inserted.id);

    if (result.ok) {
      outcome.sent++;
      outcome.details.push({
        template: plan.template,
        channel: plan.channel,
        recipient: plan.recipient,
        status: "sent",
        externalId: result.externalId,
      });
    } else {
      outcome.failed++;
      outcome.details.push({
        template: plan.template,
        channel: plan.channel,
        recipient: plan.recipient,
        status: "failed",
        failureReason: result.failureReason,
      });
    }
  }
  return outcome;
}

async function insertLogIfNew(
  plan: PlannedSend,
  orderId: string | null,
  supabase: SupabaseClient
): Promise<{ id: string | null; duplicate: boolean; error?: string }> {
  const { data, error } = await supabase
    .from("notification_log")
    .insert({
      event_id: plan.eventId,
      provider: plan.channel,
      recipient: plan.recipient,
      template: plan.template,
      payload: plan.payload,
      status: "pending",
      order_id: orderId,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    return { id: null, duplicate: true };
  }
  if (error || !data) {
    return { id: null, duplicate: false, error: error?.message ?? "no row returned" };
  }
  return { id: data.id, duplicate: false };
}

async function fetchAdminTelegramIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("role", "admin")
    .not("telegram_chat_id", "is", null);
  return ((data as { telegram_chat_id: string | null }[] | null) ?? [])
    .map((r) => r.telegram_chat_id)
    .filter((v): v is string => Boolean(v));
}

async function fetchDriverTelegramId(
  driverId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: driver } = await supabase
    .from("drivers")
    .select("telegram_chat_id, user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (!driver) return null;
  const d = driver as { telegram_chat_id: string | null; user_id: string };
  if (d.telegram_chat_id) return d.telegram_chat_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", d.user_id)
    .maybeSingle();
  return (profile as { telegram_chat_id: string | null } | null)?.telegram_chat_id ?? null;
}
