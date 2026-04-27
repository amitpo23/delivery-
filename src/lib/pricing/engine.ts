import type { PricingZone } from "./zones";

export type PackageSize = "S" | "M" | "L" | "XL";
export type Urgency = "express" | "same_day" | "next_day" | "economy";

export interface PriceRequest {
  pickupZone: PricingZone;
  deliveryZone: PricingZone;
  distanceKm: number;
  size: PackageSize;
  urgency: Urgency;
  fragile?: boolean;
  insurance?: boolean;
  declaredValue?: number;
  surge?: number;
}

export interface PriceQuote {
  basePrice: number;
  distanceCost: number;
  weightFactor: number;
  zoneFactor: number;
  urgencyFactor: number;
  fragileSurcharge: number;
  insuranceFee: number;
  surge: number;
  subtotal: number;
  vat: number;
  total: number;
  currency: "ILS";
  breakdown: {
    pickupZone: string;
    deliveryZone: string;
    formula: string;
  };
}

export const VAT_RATE = 0.17;

export const SIZE_FACTORS: Record<PackageSize, number> = {
  S: 1.0,
  M: 1.15,
  L: 1.35,
  XL: 1.7,
};

export const URGENCY_FACTORS: Record<Urgency, number> = {
  express: 2.2,
  same_day: 1.4,
  next_day: 1.0,
  economy: 0.85,
};

export const FRAGILE_SURCHARGE = 15;
export const INSURANCE_RATE = 0.02;
export const INSURANCE_MIN = 5;

/**
 * Pure pricing function. No DB, no IO.
 * Formula: ((basePrice + distance × pricePerKm) × weight × zone × urgency × surge)
 *          + fragile + insurance, then add VAT.
 *
 * Conservative zone factor: max(pickup, delivery) — the more expensive end wins.
 */
export function calculatePrice(req: PriceRequest): PriceQuote {
  const distanceKm = Math.max(0, req.distanceKm);
  const surge = req.surge ?? 1.0;

  const ratesZone =
    req.pickupZone.basePrice + req.pickupZone.pricePerKm <
    req.deliveryZone.basePrice + req.deliveryZone.pricePerKm
      ? req.deliveryZone
      : req.pickupZone;

  const basePrice = ratesZone.basePrice;
  const distanceCost = round2(distanceKm * ratesZone.pricePerKm);

  const weightFactor = SIZE_FACTORS[req.size];
  const zoneFactor = Math.max(req.pickupZone.multiplier, req.deliveryZone.multiplier);
  const urgencyFactor = URGENCY_FACTORS[req.urgency];

  const core = (basePrice + distanceCost) * weightFactor * zoneFactor * urgencyFactor * surge;
  const fragileSurcharge = req.fragile ? FRAGILE_SURCHARGE : 0;
  const insuranceFee =
    req.insurance && req.declaredValue && req.declaredValue > 0
      ? Math.max(INSURANCE_MIN, round2(req.declaredValue * INSURANCE_RATE))
      : 0;

  // All three line items are rounded to 2 decimals and `total === subtotal + vat`
  // to the agora. Previously total was Math.round'd to a whole shekel, which
  // could disagree with the displayed (subtotal + vat) by up to ±0.49 ILS.
  const subtotal = round2(core + fragileSurcharge + insuranceFee);
  const vat = round2(subtotal * VAT_RATE);
  const total = round2(subtotal + vat);

  return {
    basePrice,
    distanceCost,
    weightFactor,
    zoneFactor,
    urgencyFactor,
    fragileSurcharge,
    insuranceFee,
    surge,
    subtotal,
    vat,
    total,
    currency: "ILS",
    breakdown: {
      pickupZone: req.pickupZone.name,
      deliveryZone: req.deliveryZone.name,
      formula: "((base + km × ₪/km) × size × zone × urgency × surge) + fragile + insurance + VAT",
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
