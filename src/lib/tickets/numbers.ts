/**
 * TIK-<base36 timestamp>-<4 random>: short, sortable, collision-resistant
 * enough for tens of tickets per second per process. Mirrors the
 * generateOrderNumber pattern.
 */
export function generateTicketNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TIK-${ts}-${rand}`;
}
