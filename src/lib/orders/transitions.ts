import type { OrderStatus } from "@/types";

/**
 * Allowed status transitions actor-by-actor.
 *
 * - **Driver** owns the day-of-delivery flow: assigned → picked_up → in_transit → delivered.
 *   Drivers can also `cancelled` (e.g. address unreachable), but never roll back
 *   to an earlier state — undoing a delivery confirmation has to be an admin action.
 * - **Admin** can do everything a driver can plus revert / re-route. We don't enforce
 *   the full admin matrix in this file because admin status mutations are rare and
 *   typically go through the assign route or direct ops.
 *
 * Terminal states (`delivered`, `cancelled`, `returned`) are not in the FROM column —
 * once you're there, no driver-initiated transition is allowed.
 */
export const DRIVER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: [],
  confirmed: [],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled", "returned"],
  delivered: [],
  cancelled: [],
  returned: [],
};

export function isDriverTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return DRIVER_TRANSITIONS[from].includes(to);
}
