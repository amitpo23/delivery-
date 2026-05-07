import type { OrderStatus } from "@/types";

/**
 * Telegram callback_data is capped at 64 bytes. We pack the order UUID +
 * action there. No HMAC signing is needed because:
 *   - The Telegram webhook secret authenticates the channel itself.
 *   - The handler re-validates the chat_id ↔ driver/customer mapping and
 *     the requestor's relationship to this specific order before any
 *     mutating action.
 *
 * Two namespaces:
 *   "drv:<order_id>:<DriverAction>"    — buttons on driver-bot messages
 *   "cust:<order_id>:<CustomerAction>" — buttons on customer-bot messages
 *
 * Total at worst: 5 + 36 + 1 + 7 = 49 chars — under the 64-byte cap.
 */

export type DriverAction = "pickup" | "transit" | "deliver" | "return" | "issue";
export type CustomerAction = "refresh" | "cancel" | "chat";

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
const DRIVER_ACTIONS: ReadonlySet<DriverAction> = new Set([
  "pickup",
  "transit",
  "deliver",
  "return",
  "issue",
]);
const CUSTOMER_ACTIONS: ReadonlySet<CustomerAction> = new Set([
  "refresh",
  "cancel",
  "chat",
]);

export type DecodedCallback =
  | { kind: "driver"; orderId: string; action: DriverAction }
  | { kind: "customer"; orderId: string; action: CustomerAction };

export function encodeCallback(orderId: string, action: DriverAction): string {
  return `drv:${orderId}:${action}`;
}

export function encodeCustomerCallback(
  orderId: string,
  action: CustomerAction,
): string {
  return `cust:${orderId}:${action}`;
}

/**
 * Decode a `drv:` (driver) callback. Returns null for any other shape —
 * customer callbacks must go through {@link decodeAnyCallback}.
 *
 * Kept separate (not just a wrapper around decodeAnyCallback) so the
 * driver handler's call site doesn't have to runtime-check `kind` and
 * the existing tests stay typed against this exact return shape.
 */
export function decodeCallback(
  data: string,
): { orderId: string; action: DriverAction } | null {
  const parts = data.split(":");
  if (parts.length !== 3) return null;
  if (parts[0] !== "drv") return null;
  if (!UUID_RE.test(parts[1])) return null;
  const action = parts[2];
  if (!DRIVER_ACTIONS.has(action as DriverAction)) return null;
  return { orderId: parts[1], action: action as DriverAction };
}

/**
 * Decode any of the supported namespaces. Use this at the webhook entry
 * point where you don't yet know if the tap came from a driver button or
 * a customer button.
 */
export function decodeAnyCallback(data: string): DecodedCallback | null {
  const parts = data.split(":");
  if (parts.length !== 3) return null;
  if (!UUID_RE.test(parts[1])) return null;
  if (parts[0] === "drv") {
    if (!DRIVER_ACTIONS.has(parts[2] as DriverAction)) return null;
    return { kind: "driver", orderId: parts[1], action: parts[2] as DriverAction };
  }
  if (parts[0] === "cust") {
    if (!CUSTOMER_ACTIONS.has(parts[2] as CustomerAction)) return null;
    return { kind: "customer", orderId: parts[1], action: parts[2] as CustomerAction };
  }
  return null;
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
  status: OrderStatus,
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

/**
 * Returns the inline keyboard for a customer viewing their order. Always
 * includes "🔄 רענן" and "📞 צרו קשר"; "🚫 בטל הזמנה" only on cancellable
 * statuses (the handler still re-checks — buttons are a hint, not a gate).
 */
export function customerKeyboardForStatus(
  orderId: string,
  status: OrderStatus,
): InlineKeyboard {
  const cancellable: OrderStatus[] = ["pending", "confirmed", "assigned"];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  rows.push([
    { text: "🔄 רענן", callback_data: encodeCustomerCallback(orderId, "refresh") },
    { text: "📞 צרו קשר", callback_data: encodeCustomerCallback(orderId, "chat") },
  ]);

  if (cancellable.includes(status)) {
    rows.push([
      { text: "🚫 בטל הזמנה", callback_data: encodeCustomerCallback(orderId, "cancel") },
    ]);
  }
  return { inline_keyboard: rows };
}

export const CUSTOMER_CANCELLABLE_STATUSES: ReadonlyArray<OrderStatus> = [
  "pending",
  "confirmed",
  "assigned",
];
