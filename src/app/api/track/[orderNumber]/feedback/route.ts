import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  phone: z.string().min(2).max(40),
});

/**
 * Customer rates the delivery after it's been delivered. Phone-based
 * ownership check (same as the complaint flow). Once a rating is set
 * we don't allow changes — the rating is locked when first written.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const rl = rateLimit(`feedback:${getRequestIp(req)}`, { max: 20, refillPerMinute: 20 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  const { orderNumber } = await context.params;
  if (!/^DEL-[A-Z0-9-]+$/i.test(orderNumber)) {
    return NextResponse.json({ error: "Invalid tracking number" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = Body.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, rating, booker_phone, customer:customers(profile:profiles!customers_user_id_fkey(phone))")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "Order is not delivered yet" }, { status: 409 });
  }
  if (order.rating != null) {
    return NextResponse.json({ error: "Already rated" }, { status: 409 });
  }

  type Profile = { phone: string };
  const callerDigits = v.data.phone.replace(/\D/g, "");
  const bookerDigits = (order.booker_phone ?? "").replace(/\D/g, "");
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
  if (!ownsOrder) {
    return NextResponse.json({ error: "Phone does not match this order" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("orders")
    .update({ rating: v.data.rating, feedback: v.data.feedback ?? null })
    .eq("id", order.id)
    .select("id, rating")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ order: data });
}
