import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateBody = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
  rewardType: z.enum(["percent", "flat"]),
  rewardValue: z.number().positive(),
  maxDiscount: z.number().nonnegative().nullable().optional(),
  minOrderAmount: z.number().nonnegative().default(0),
  maxTotalUses: z.number().int().positive().nullable().optional(),
  maxPerPhone: z.number().int().min(0).default(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .select("*, redemptions:coupon_redemptions(id, amount_discounted)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type CouponRow = {
    id: string;
    redemptions?: { id: string; amount_discounted: number }[];
    [k: string]: unknown;
  };
  const enriched = (data as CouponRow[]).map((c) => ({
    ...c,
    redemption_count: c.redemptions?.length ?? 0,
    total_discounted:
      c.redemptions?.reduce((sum, r) => sum + Number(r.amount_discounted), 0) ?? 0,
    redemptions: undefined,
  }));
  return NextResponse.json({ coupons: enriched });
}

export async function POST(req: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = CreateBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .insert({
      code: v.data.code.toUpperCase(),
      description: v.data.description ?? null,
      reward_type: v.data.rewardType,
      reward_value: v.data.rewardValue,
      max_discount: v.data.maxDiscount ?? null,
      min_order_amount: v.data.minOrderAmount,
      max_total_uses: v.data.maxTotalUses ?? null,
      max_per_phone: v.data.maxPerPhone,
      expires_at: v.data.expiresAt ?? null,
      created_by: guard.user.id,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}
