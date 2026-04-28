import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice, type PackageSize, type Urgency } from "@/lib/pricing/engine";
import { estimateZoneDistanceKm, resolveSubZone, resolveZone } from "@/lib/pricing/zones";
import { geocodeAddress } from "@/lib/geocoding/google";
import { haversineKm } from "@/lib/geo/distance";

const QuoteRequestSchema = z.object({
  pickupAddress: z.string().min(2),
  deliveryAddress: z.string().min(2),
  // Optional advisory hint from the client. The server clamps it to at least
  // the zone-pair floor so a malicious caller cannot get a cheaper price by
  // shrinking the distance. Same logic in /api/orders — see PR #4 review.
  distanceKm: z.number().nonnegative().max(500).optional(),
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

  const zoneFloorKm = estimateZoneDistanceKm(pickupZone, deliveryZone);

  // Geocode both endpoints in parallel; use the geodesic distance as a tighter
  // floor than the coarse zone-pair matrix when we have it. Falls back to the
  // zone matrix on any geocode failure (no API key, network, no result).
  const [pickupGeo, deliveryGeo] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(deliveryAddress),
  ]);
  const geoDistanceKm =
    pickupGeo && deliveryGeo ? haversineKm(pickupGeo, deliveryGeo) : null;
  const groundFloorKm = Math.max(zoneFloorKm, geoDistanceKm ?? 0);
  const effectiveDistanceKm = Math.max(groundFloorKm, Math.min(distanceKm ?? 0, 500));

  const pickupSubZone = resolveSubZone(pickupAddress, pickupZone);
  const deliverySubZone = resolveSubZone(deliveryAddress, deliveryZone);
  const subZoneFactor = Math.max(pickupSubZone.multiplier, deliverySubZone.multiplier);

  const quote = calculatePrice({
    pickupZone,
    deliveryZone,
    distanceKm: effectiveDistanceKm,
    size: size as PackageSize,
    urgency: urgency as Urgency,
    fragile,
    insurance,
    declaredValue,
    surge,
    subZoneFactor,
  });

  return NextResponse.json({
    quote,
    distanceKm: effectiveDistanceKm,
    distanceSource: geoDistanceKm !== null ? "geocoded" : "zone-floor",
    subZones: {
      pickup: pickupSubZone.name || null,
      delivery: deliverySubZone.name || null,
    },
    coordinates: pickupGeo && deliveryGeo
      ? {
          pickup: { lat: pickupGeo.lat, lng: pickupGeo.lng },
          delivery: { lat: deliveryGeo.lat, lng: deliveryGeo.lng },
        }
      : null,
  });
}
