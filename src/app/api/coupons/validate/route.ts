import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupons/redeem";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

const Body = z.object({
  code: z.string().min(2).max(40),
  subtotal: z.number().nonnegative(),
  phone: z.string().min(2).max(40),
});

/**
 * Public endpoint the booking page calls when the user types a code.
 * Heavy rate limit because failed code attempts cost a DB lookup —
 * also blocks coupon-bruteforce.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`coupon-validate:${getRequestIp(req)}`, {
    max: 30,
    refillPerMinute: 30,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
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

  const result = await validateCoupon(v.data);
  return NextResponse.json(result);
}
