import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTicketNumber } from "@/lib/tickets/numbers";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

const Body = z.object({
  category: z.enum(["damaged", "missing", "wrong_address", "late", "return_request", "other"]),
  description: z.string().min(5).max(2000),
  // The phone the customer used at booking — proves they own this order
  // when no auth session is present (anonymous bookings).
  phone: z.string().min(2).max(40),
});

const CATEGORY_LABELS: Record<string, string> = {
  damaged: "חבילה פגומה",
  missing: "חבילה חסרה",
  wrong_address: "כתובת שגויה",
  late: "איחור",
  return_request: "בקשת החזרה",
  other: "אחר",
};

/**
 * Public endpoint: a tracker creates a complaint ticket for an order.
 * We accept the phone as proof-of-ownership (matched against the order's
 * booker_phone or its registered customer's phone). This is enough for
 * MVP — a real fraud-resistant flow would email/SMS a confirmation
 * code first.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const rl = rateLimit(`complaint:${getRequestIp(req)}`, { max: 10, refillPerMinute: 10 });
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
    .select("id, customer_id, booker_phone, status, customer:customers(profile:profiles!customers_user_id_fkey(phone))")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const callerDigits = v.data.phone.replace(/\D/g, "");
  const bookerDigits = (order.booker_phone ?? "").replace(/\D/g, "");
  type Profile = { phone: string };
  const customerObj = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const customerProfile = customerObj
    ? Array.isArray(customerObj.profile)
      ? customerObj.profile[0]
      : customerObj.profile
    : null;
  const customerPhone = (customerProfile as Profile | null)?.phone ?? "";
  const customerDigits = customerPhone.replace(/\D/g, "");
  const ownsOrder =
    callerDigits.length >= 7 &&
    (callerDigits === bookerDigits || callerDigits === customerDigits);
  if (!ownsOrder) {
    // Don't disclose ownership info — same wording for either failure.
    return NextResponse.json({ error: "Phone does not match this order" }, { status: 403 });
  }

  // Auto-bump priority for damaged / return / late so the queue surfaces
  // these in front of "other".
  const priority =
    v.data.category === "damaged" ||
    v.data.category === "return_request" ||
    v.data.category === "late"
      ? "high"
      : "normal";

  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      ticket_number: generateTicketNumber(),
      customer_id: order.customer_id ?? null,
      customer_phone: v.data.phone,
      order_id: order.id,
      subject: `${CATEGORY_LABELS[v.data.category]} - ${orderNumber}`,
      description: v.data.description,
      priority,
      source: "customer_complaint",
    })
    .select("id, ticket_number")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket });
}
