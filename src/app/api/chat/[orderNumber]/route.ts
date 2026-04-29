import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

/**
 * Chat for an order. Three caller types are supported on the same
 * endpoint:
 *   - authenticated driver (must own the order)
 *   - authenticated admin / dispatcher
 *   - anonymous customer (proves ownership via ?phone=... matching
 *     booker_phone or the registered customer's phone)
 */

const PostBody = z.object({
  body: z.string().min(1).max(2000),
  /** Required for the anonymous-customer path. Ignored when authed. */
  phone: z.string().min(2).max(40).optional(),
});

interface OrderRecord {
  id: string;
  driver_id: string | null;
  customer_id: string | null;
  booker_phone: string | null;
  customer:
    | { profile: { phone: string } | { phone: string }[] | null }
    | { profile: { phone: string } | { phone: string }[] | null }[]
    | null;
}

async function resolveSender(args: {
  orderNumber: string;
  phone?: string;
}): Promise<
  | { ok: true; orderId: string; role: "customer" | "driver" | "admin"; name: string | null }
  | { ok: false; status: number; error: string }
> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      `id, driver_id, customer_id, booker_phone,
       customer:customers(profile:profiles!customers_user_id_fkey(phone))`,
    )
    .eq("order_number", args.orderNumber)
    .maybeSingle<OrderRecord>();

  if (!order) return { ok: false, status: 404, error: "Order not found" };

  // Try authenticated path first.
  const session = await createServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "admin" || profile?.role === "dispatcher") {
      return { ok: true, orderId: order.id, role: "admin", name: profile.full_name };
    }
    if (profile?.role === "driver") {
      const { data: driver } = await admin
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (driver?.id !== order.driver_id) {
        return { ok: false, status: 403, error: "Not your order" };
      }
      return { ok: true, orderId: order.id, role: "driver", name: profile.full_name };
    }
    if (profile?.role === "customer") {
      // Match against the customer's profile id via the order's customer_id
      // — same logic the portal uses to scope orders.
      const { data: cust } = await admin
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cust?.id !== order.customer_id) {
        return { ok: false, status: 403, error: "Not your order" };
      }
      return { ok: true, orderId: order.id, role: "customer", name: profile.full_name };
    }
  }

  // Anonymous customer path — phone must match booker_phone or registered
  // customer's phone (same proof-of-ownership we use for complaints).
  const callerDigits = (args.phone ?? "").replace(/\D/g, "");
  const bookerDigits = (order.booker_phone ?? "").replace(/\D/g, "");
  type Profile = { phone: string };
  const customerObj = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const customerProfile = customerObj
    ? Array.isArray(customerObj.profile)
      ? customerObj.profile[0]
      : customerObj.profile
    : null;
  const customerDigits = ((customerProfile as Profile | null)?.phone ?? "").replace(/\D/g, "");
  const ownsOrder =
    callerDigits.length >= 7 &&
    (callerDigits === bookerDigits || callerDigits === customerDigits);
  if (!ownsOrder) return { ok: false, status: 403, error: "Phone does not match this order" };

  return { ok: true, orderId: order.id, role: "customer", name: null };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await context.params;
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") ?? undefined;

  const sender = await resolveSender({ orderNumber, phone });
  if (!sender.ok) return NextResponse.json({ error: sender.error }, { status: sender.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select("id, sender_role, sender_name, body, read_by_recipient, created_at")
    .eq("order_id", sender.orderId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark messages from "the other side" as read on fetch.
  const otherRoles =
    sender.role === "customer" ? ["driver", "admin"] : sender.role === "driver" ? ["customer", "admin"] : ["customer", "driver"];
  await admin
    .from("chat_messages")
    .update({ read_by_recipient: true })
    .eq("order_id", sender.orderId)
    .in("sender_role", otherRoles)
    .eq("read_by_recipient", false);

  return NextResponse.json({ messages: data ?? [], role: sender.role });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const rl = rateLimit(`chat:${getRequestIp(req)}`, { max: 60, refillPerMinute: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { orderNumber } = await context.params;
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = PostBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const sender = await resolveSender({ orderNumber, phone: v.data.phone });
  if (!sender.ok) return NextResponse.json({ error: sender.error }, { status: sender.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .insert({
      order_id: sender.orderId,
      sender_role: sender.role,
      sender_name: sender.name,
      body: v.data.body,
    })
    .select("id, sender_role, sender_name, body, read_by_recipient, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: data });
}
