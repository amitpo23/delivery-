import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextRun, type Frequency } from "@/lib/recurring/schedule";

const Body = z.object({
  name: z.string().min(2),
  customerId: z.string().uuid().nullable().optional(),
  bookerFullName: z.string().min(2),
  bookerPhone: z.string().min(7),
  bookerEmail: z.string().email().nullable().optional(),
  pickupAddress: z.string().min(2),
  pickupContactName: z.string().min(1),
  pickupContactPhone: z.string().min(7),
  deliveryAddress: z.string().min(2),
  deliveryContactName: z.string().min(1),
  deliveryContactPhone: z.string().min(7),
  size: z.enum(["S", "M", "L", "XL"]),
  urgency: z.enum(["express", "same_day", "next_day", "economy"]),
  notes: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  hourOfDay: z.number().int().min(0).max(23).default(6),
});

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recurring_orders")
    .select("*, runs:recurring_runs(id, status, ran_at)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurring: data ?? [] });
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
  const v = Body.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const next = nextRun({
    from: new Date(),
    frequency: v.data.frequency as Frequency,
    weekday: v.data.weekday ?? null,
    hourOfDay: v.data.hourOfDay,
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recurring_orders")
    .insert({
      name: v.data.name,
      customer_id: v.data.customerId ?? null,
      booker_full_name: v.data.bookerFullName,
      booker_phone: v.data.bookerPhone,
      booker_email: v.data.bookerEmail ?? null,
      pickup_address: v.data.pickupAddress,
      pickup_contact_name: v.data.pickupContactName,
      pickup_contact_phone: v.data.pickupContactPhone,
      delivery_address: v.data.deliveryAddress,
      delivery_contact_name: v.data.deliveryContactName,
      delivery_contact_phone: v.data.deliveryContactPhone,
      size: v.data.size,
      urgency: v.data.urgency,
      notes: v.data.notes ?? null,
      frequency: v.data.frequency,
      weekday: v.data.weekday ?? null,
      hour_of_day: v.data.hourOfDay,
      next_run_at: next.toISOString(),
      created_by: guard.user.id,
    })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recurring: data });
}
