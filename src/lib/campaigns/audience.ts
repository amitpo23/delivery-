import { createAdminClient } from "@/lib/supabase/admin";

export interface AudienceFilter {
  tags?: string[];
  minOrders?: number;
  maxDaysSinceLast?: number;
}

export interface AudienceResult {
  email: string;
  customer_id: string | null;
  full_name: string;
  tags: string[];
  total_orders: number;
}

/**
 * Resolves an audience filter into the deduped list of (email, customer)
 * pairs to send to. Pulls from auth.users for the email (only registered
 * customers — anonymous bookings have no email opt-in path).
 */
export async function resolveAudience(filter: AudienceFilter): Promise<AudienceResult[]> {
  const admin = createAdminClient();

  const { data: customers, error: custErr } = await admin
    .from("customers")
    .select(
      `id, user_id, tags,
       profile:profiles!customers_user_id_fkey(full_name)`,
    );
  if (custErr || !customers) return [];

  const userIds = customers.map((c) => c.user_id).filter(Boolean) as string[];
  if (userIds.length === 0) return [];

  // Email is on auth.users — fetch via admin API.
  const emailByUserId = new Map<string, string>();
  // Supabase admin API listUsers paginates; iterate pages.
  // For our scale (<10k customers), 1-2 pages is enough.
  for (let page = 1; page <= 5; page++) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !list?.users || list.users.length === 0) break;
    for (const u of list.users) if (u.email) emailByUserId.set(u.id, u.email);
    if (list.users.length < 200) break;
  }

  // Order aggregates per customer
  const { data: orders } = await admin
    .from("orders")
    .select("customer_id, created_at, status")
    .not("customer_id", "is", null);
  const ordersByCustomer = new Map<string, { count: number; lastAt: string | null }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const cur = ordersByCustomer.get(o.customer_id) ?? { count: 0, lastAt: null };
    cur.count += 1;
    if (!cur.lastAt || o.created_at > cur.lastAt) cur.lastAt = o.created_at;
    ordersByCustomer.set(o.customer_id, cur);
  }

  const out: AudienceResult[] = [];
  const seen = new Set<string>();
  type Profile = { full_name: string };

  for (const c of customers) {
    if (!c.user_id) continue;
    const email = emailByUserId.get(c.user_id);
    if (!email || seen.has(email)) continue;

    const tags: string[] = (c.tags as string[]) ?? [];
    const stats = ordersByCustomer.get(c.id) ?? { count: 0, lastAt: null };

    if (filter.tags && filter.tags.length > 0) {
      if (!filter.tags.some((t) => tags.includes(t))) continue;
    }
    if (filter.minOrders != null && stats.count < filter.minOrders) continue;
    if (filter.maxDaysSinceLast != null) {
      if (!stats.lastAt) continue;
      const days = (Date.now() - new Date(stats.lastAt).getTime()) / 86400_000;
      if (days > filter.maxDaysSinceLast) continue;
    }

    const profile = (Array.isArray(c.profile) ? c.profile[0] : c.profile) as Profile | null;
    out.push({
      email,
      customer_id: c.id,
      full_name: profile?.full_name ?? "",
      tags,
      total_orders: stats.count,
    });
    seen.add(email);
  }

  return out;
}
