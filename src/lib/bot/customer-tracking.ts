import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { customerKeyboardForStatus, type InlineKeyboard } from "./callback";

/**
 * Customer-side bot helpers — looking up an order by its tracking number,
 * formatting a Hebrew status card, and binding the right inline keyboard.
 *
 * The bot accepts free-form DEL-XXX from any chat (no /connect needed) so
 * a recipient who doesn't have an account can still track. Anything that
 * mutates the order (cancel) is gated on a phone match in the callback
 * handler — see handle-customer-callback.ts.
 */

export const TRACKING_REGEX = /^DEL-[A-Z0-9-]+$/i;

export function isTrackingNumber(text: string): boolean {
  return TRACKING_REGEX.test(text.trim());
}

export interface TrackingCard {
  text: string;
  replyMarkup: InlineKeyboard;
  found: true;
}

export interface TrackingNotFound {
  text: string;
  found: false;
}

/**
 * Look up an order by tracking number and render the Hebrew status card.
 * Errors and unknown numbers fold into a friendly "not found" message
 * — we don't surface DB errors verbatim because anyone can ping this.
 */
export async function buildTrackingCard(
  trackingNumber: string,
  supabase: SupabaseClient,
): Promise<TrackingCard | TrackingNotFound> {
  const normalized = trackingNumber.trim().toUpperCase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, pickup_address, delivery_address, time_window, delivered_at, estimated_price",
    )
    .eq("order_number", normalized)
    .maybeSingle();

  if (error || !data) {
    return {
      found: false,
      text: `לא נמצאה הזמנה עם מספר ${normalized}.\nודאו שהוקלד נכון או שלחו /start לחזרה לתפריט.`,
    };
  }

  const order = data as {
    id: string;
    order_number: string;
    status: OrderStatus;
    pickup_address: string;
    delivery_address: string;
    time_window: string | null;
    delivered_at: string | null;
    estimated_price: number | null;
  };

  return {
    found: true,
    text: renderStatusCard(order),
    replyMarkup: customerKeyboardForStatus(order.id, order.status),
  };
}

/**
 * Hebrew, plain-text card. Plain text rather than Markdown because:
 *   - Telegram's MD escaping is a footgun on user-supplied addresses.
 *   - Green API renders Markdown inconsistently.
 */
export function renderStatusCard(order: {
  order_number: string;
  status: OrderStatus;
  pickup_address: string;
  delivery_address: string;
  time_window: string | null;
  delivered_at: string | null;
  estimated_price: number | null;
}): string {
  const lines: string[] = [];
  lines.push(`📦 הזמנה #${order.order_number}`);
  lines.push(`סטטוס: ${ORDER_STATUS_LABELS[order.status]}`);
  lines.push("");
  lines.push(`📍 איסוף: ${order.pickup_address}`);
  lines.push(`📍 מסירה: ${order.delivery_address}`);
  if (order.time_window) {
    lines.push(`⏰ חלון: ${order.time_window}`);
  }
  if (order.estimated_price != null) {
    lines.push(`💵 מחיר משוער: ${order.estimated_price} ₪`);
  }
  if (order.status === "delivered" && order.delivered_at) {
    lines.push(`✅ נמסרה: ${new Date(order.delivered_at).toLocaleString("he-IL")}`);
  }
  return lines.join("\n");
}
