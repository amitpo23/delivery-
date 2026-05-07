import type { OrderStatus } from "@/types";

/**
 * Telegram callback_data is capped at 64 bytes. We pack the order UUID +
 * action there. No HMAC signing is needed because:
 *   - The Telegram webhook secret authenticates the channel itself.
 *   - The handler re-validates the chat_id ↔ driver mapping and the
 *     driver's assignment to this specific order before mutating state.
 *
 * Format: "drv:<order_id>:<action>"
 *   action ∈ "pickup" | "transit" | "deliver" | "return" | "issue"
 *
 * Total: 4 + 36 + 1 + 7 = 48 chars max — well under the 64-byte cap.
 */

export type DriverAction = "pickup" | "transit" | "deliver" | "return" | "issue";

/**
 * Action -> resulting OrderStatus. "issue" is intentionally absent: it opens
 * a ticket without a status flip.
 */
export const DRIVER_ACTION_TO_STATUS: Record<
  Exclude<DriverAction, "issue">,
  OrderStatus
> = {
  pickup: "picked_up",
  transit: "in_transit",
  deliver: "delivered",
  return: "returned",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: ReadonlySet<DriverAction> = new Set([
  "pickup",
  "transit",
  "deliver",
  "return",
  "issue",
]);

export function encodeCallback(orderId: string, action: DriverAction): string {
  return `drv:${orderId}:${action}`;
}

export function decodeCallback(
  data: string
): { orderId: string; action: DriverAction } | null {
  const parts = data.split(":");
  if (parts.length !== 3) return null;
  if (parts[0] !== "drv") return null;
  if (!UUID_RE.test(parts[1])) return null;
  const action = parts[2];
  if (!ACTIONS.has(action as DriverAction)) return null;
  return { orderId: parts[1], action: action as DriverAction };
}

export interface InlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

/**
 * Returns the inline keyboard appropriate for a driver staring at an order
 * in `status`. Terminal/non-actionable states return null so the caller can
 * skip rendering buttons.
 */
export function driverKeyboardForStatus(
  orderId: string,
  status: OrderStatus
): InlineKeyboard | null {
  switch (status) {
    case "assigned":
      return {
        inline_keyboard: [
          [
            { text: "📦 נאספה", callback_data: encodeCallback(orderId, "pickup") },
            { text: "❌ בעיה", callback_data: encodeCallback(orderId, "issue") },
          ],
        ],
      };
    case "picked_up":
      return {
        inline_keyboard: [
          [
            { text: "🚚 בדרך ללקוח", callback_data: encodeCallback(orderId, "transit") },
            { text: "❌ בעיה", callback_data: encodeCallback(orderId, "issue") },
          ],
        ],
      };
    case "in_transit":
      return {
        inline_keyboard: [
          [
            { text: "✅ נמסרה", callback_data: encodeCallback(orderId, "deliver") },
            { text: "↩️ הוחזרה", callback_data: encodeCallback(orderId, "return") },
          ],
          [{ text: "❌ בעיה", callback_data: encodeCallback(orderId, "issue") }],
        ],
      };
    default:
      return null;
  }
}
