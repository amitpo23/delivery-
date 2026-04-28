import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getRequestIp } from "@/lib/rate-limit";

/**
 * Read-side: returns the rows admins can edit (zones + pricing_rules).
 * The TS pricing engine still reads from src/lib/pricing/zones.ts —
 * this surface lets the dispatcher tweak DB-side numbers (e.g. for
 * reporting / future engine version) without redeploying. The TS file
 * remains the runtime source of truth until we wire engine to DB.
 */
export async function GET() {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const [zonesRes, rulesRes] = await Promise.all([
    admin.from("zones").select("*").order("name"),
    admin.from("pricing_rules").select("*").order("service_type"),
  ]);

  if (zonesRes.error) return NextResponse.json({ error: zonesRes.error.message }, { status: 500 });
  if (rulesRes.error) return NextResponse.json({ error: rulesRes.error.message }, { status: 500 });

  return NextResponse.json({
    zones: zonesRes.data ?? [],
    pricing_rules: rulesRes.data ?? [],
  });
}

const ZoneUpdate = z.object({
  id: z.string().uuid(),
  base_price: z.number().nonnegative(),
  price_per_km: z.number().nonnegative(),
  multiplier: z.number().min(0.5).max(5),
});

const RuleUpdate = z.object({
  id: z.string().uuid(),
  urgency_multiplier: z.number().min(0.5).max(5),
});

const PatchBody = z.object({
  zones: z.array(ZoneUpdate).optional(),
  pricing_rules: z.array(RuleUpdate).optional(),
});

export async function PATCH(req: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = PatchBody.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const updated = { zones: 0, rules: 0 };

  for (const z of v.data.zones ?? []) {
    const { error } = await admin
      .from("zones")
      .update({
        base_price: z.base_price,
        price_per_km: z.price_per_km,
        multiplier: z.multiplier,
      })
      .eq("id", z.id);
    if (!error) updated.zones += 1;
  }

  for (const r of v.data.pricing_rules ?? []) {
    const { error } = await admin
      .from("pricing_rules")
      .update({ urgency_multiplier: r.urgency_multiplier })
      .eq("id", r.id);
    if (!error) updated.rules += 1;
  }

  await logAudit({
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    actorRole: guard.role,
    action: "settings.update",
    targetType: "settings",
    targetId: null,
    after: { ...updated, zones: v.data.zones, pricing_rules: v.data.pricing_rules },
    ip: getRequestIp(req),
  });

  return NextResponse.json({ updated });
}
