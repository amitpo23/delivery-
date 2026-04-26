import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice, type PackageSize, type Urgency } from "@/lib/pricing/engine";
import { resolveZone } from "@/lib/pricing/zones";

const QuoteRequestSchema = z.object({
  pickupAddress: z.string().min(2),
  deliveryAddress: z.string().min(2),
  distanceKm: z.number().nonnegative().max(500),
  size: z.enum(["S", "M", "L", "XL"]),
  urgency: z.enum(["express", "same_day", "next_day", "economy"]),
  fragile: z.boolean().optional(),
  insurance: z.boolean().optional(),
  declaredValue: z.number().nonnegative().optional(),
  surge: z.number().min(1).max(3).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { pickupAddress, deliveryAddress, distanceKm, size, urgency, fragile, insurance, declaredValue, surge } =
    parsed.data;

  const pickupZone = resolveZone(pickupAddress);
  const deliveryZone = resolveZone(deliveryAddress);

  if (!pickupZone || !deliveryZone) {
    return NextResponse.json(
      {
        error: "Address outside coverage area",
        coverage: ["חיפה", "מ\"א מגידו", "מ\"א גלבוע", "מ\"א בקעת בית שאן", "עפולה", "התענכים"],
        unresolved: [
          !pickupZone ? { field: "pickupAddress", value: pickupAddress } : null,
          !deliveryZone ? { field: "deliveryAddress", value: deliveryAddress } : null,
        ].filter(Boolean),
      },
      { status: 422 }
    );
  }

  const quote = calculatePrice({
    pickupZone,
    deliveryZone,
    distanceKm,
    size: size as PackageSize,
    urgency: urgency as Urgency,
    fragile,
    insurance,
    declaredValue,
    surge,
  });

  return NextResponse.json({ quote });
}
