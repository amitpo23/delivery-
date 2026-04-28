import type { ServiceType } from "@/types";

/**
 * SLA deadlines per service tier — measured from order creation, not from
 * pickup, so the dispatcher's lag eats into the budget. These are the same
 * numbers the homepage advertises (SERVICE_TYPES) so the contract matches
 * what the customer was promised at booking time.
 *
 * Edit here, not in the page copy, so the badge on /admin/orders, the
 * SLA report, and the auto-late ticket flow all use the same source.
 */
const SLA_HOURS: Record<ServiceType, number> = {
  express: 4,
  same_day: 12,
  next_day: 30,
  economy: 72,
};

export function slaHoursFor(service: ServiceType): number {
  return SLA_HOURS[service];
}

export function slaDeadline(createdAt: Date | string, service: ServiceType): Date {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(created.getTime() + SLA_HOURS[service] * 3_600_000);
}

/**
 * Returns minutes until the deadline (negative once breached).
 */
export function slaMinutesRemaining(
  createdAt: Date | string,
  service: ServiceType,
  now: Date = new Date(),
): number {
  return Math.round((slaDeadline(createdAt, service).getTime() - now.getTime()) / 60_000);
}

export function isSlaBreached(
  createdAt: Date | string,
  service: ServiceType,
  deliveredAt: Date | string | null,
  now: Date = new Date(),
): boolean {
  const reference = deliveredAt
    ? deliveredAt instanceof Date
      ? deliveredAt
      : new Date(deliveredAt)
    : now;
  return reference > slaDeadline(createdAt, service);
}
