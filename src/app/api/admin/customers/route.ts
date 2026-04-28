import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the customer list with aggregated order stats so the table can
 * sort/filter without a second round trip per row. Stats are computed in
 * application code rather than a view so the migration footprint stays
 * small — this list rarely exceeds a few thousand rows.
 *
 * Includes guest-only orders too, surfaced under a synthetic
 * "phone bucket" so the dispatcher can see "this number ordered 5×"
 * even without a customer row. Toggle via ?guests=1.
 */
export async function GET(req: Request) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const includeGuests = url.searchParams.get("guests") === "1";

  const admin = createAdminClient();

  const [customersRes, ordersRes] = await Promise.all([
    admin
      .from("customers")
      .select(
        `id, user_id, customer_type, company_name, notes, tags, created_at,
         profile:profiles!customers_user_id_fkey(full_name, phone)`,
      )
      .order("created_at", { ascending: false }),
    admin
      .from("orders")
      .select(
        "id, customer_id, booker_phone, booker_full_name, status, estimated_price, final_price, created_at, delivered_at",
      ),
  ]);

  if (customersRes.error) {
    return NextResponse.json({ error: customersRes.error.message }, { status: 500 });
  }
  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  const orders = ordersRes.data ?? [];
  const ordersByCustomer = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const arr = ordersByCustomer.get(o.customer_id) ?? [];
    arr.push(o);
    ordersByCustomer.set(o.customer_id, arr);
  }

  type CustomerRow = {
    id: string;
    customer_type: string;
    company_name: string | null;
    notes: string | null;
    tags: string[];
    full_name: string;
    phone: string;
    total_orders: number;
    total_spent: number;
    delivered_orders: number;
    last_order_at: string | null;
    is_guest: false;
  };

  type GuestRow = {
    id: string; // synthetic — phone-based
    customer_type: "guest";
    company_name: null;
    notes: null;
    tags: string[];
    full_name: string;
    phone: string;
    total_orders: number;
    total_spent: number;
    delivered_orders: number;
    last_order_at: string | null;
    is_guest: true;
  };

  type Profile = { full_name: string; phone: string };
  const customers: CustomerRow[] = (customersRes.data ?? []).map((c) => {
    const list = ordersByCustomer.get(c.id) ?? [];
    const totalSpent = list.reduce(
      (sum, o) => sum + Number(o.final_price ?? o.estimated_price ?? 0),
      0,
    );
    const delivered = list.filter((o) => o.status === "delivered").length;
    const lastOrder = list.length
      ? list.reduce((max, o) => (o.created_at > max ? o.created_at : max), "")
      : null;
    const profile = (Array.isArray(c.profile) ? c.profile[0] : c.profile) as Profile | null;
    return {
      id: c.id,
      customer_type: c.customer_type,
      company_name: c.company_name,
      notes: c.notes,
      tags: (c.tags as string[]) ?? [],
      full_name: profile?.full_name ?? "—",
      phone: profile?.phone ?? "",
      total_orders: list.length,
      total_spent: Math.round(totalSpent * 100) / 100,
      delivered_orders: delivered,
      last_order_at: lastOrder || null,
      is_guest: false,
    };
  });

  let guests: GuestRow[] = [];
  if (includeGuests) {
    const guestBuckets = new Map<string, GuestRow>();
    for (const o of orders) {
      if (o.customer_id || !o.booker_phone) continue;
      const key = o.booker_phone;
      let g = guestBuckets.get(key);
      if (!g) {
        g = {
          id: `guest:${key}`,
          customer_type: "guest",
          company_name: null,
          notes: null,
          tags: [],
          full_name: o.booker_full_name ?? "אורח",
          phone: key,
          total_orders: 0,
          total_spent: 0,
          delivered_orders: 0,
          last_order_at: null,
          is_guest: true,
        };
        guestBuckets.set(key, g);
      }
      g.total_orders += 1;
      g.total_spent += Number(o.final_price ?? o.estimated_price ?? 0);
      if (o.status === "delivered") g.delivered_orders += 1;
      if (!g.last_order_at || o.created_at > g.last_order_at) {
        g.last_order_at = o.created_at;
      }
    }
    for (const g of guestBuckets.values()) {
      g.total_spent = Math.round(g.total_spent * 100) / 100;
    }
    guests = Array.from(guestBuckets.values());
  }

  return NextResponse.json({ customers, guests });
}
