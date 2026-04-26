import { describe, it, expect } from "vitest";
import { calculatePrice, SIZE_FACTORS, URGENCY_FACTORS, VAT_RATE } from "../engine";
import { getZoneById } from "../zones";

const haifa = getZoneById("haifa")!;
const afula = getZoneById("afula")!;
const beitShean = getZoneById("beit_shean")!;
const gilboa = getZoneById("gilboa")!;

describe("calculatePrice — formula correctness", () => {
  it("computes the simplest case: Haifa→Haifa, 0km, S, next_day", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 0,
      size: "S",
      urgency: "next_day",
    });
    // base 20, distance 0, factors all 1.0 → subtotal 20, VAT 3.4, total round(23.4) = 23
    expect(q.subtotal).toBe(20);
    expect(q.total).toBe(23);
    expect(q.currency).toBe("ILS");
  });

  it("applies distance × price_per_km", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 10,
      size: "S",
      urgency: "next_day",
    });
    // base 20 + 10*1.0 = 30, VAT 5.1, total 35
    expect(q.distanceCost).toBe(10);
    expect(q.subtotal).toBe(30);
    expect(q.total).toBe(35);
  });

  it("uses the more expensive zone for rates (delivery wins)", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: beitShean,
      distanceKm: 50,
      size: "S",
      urgency: "next_day",
    });
    // beit_shean: base 35, ppk 1.5 → distance 75; multiplier 1.2
    // (35 + 75) * 1 * 1.2 * 1 * 1 = 132 subtotal
    expect(q.distanceCost).toBe(75);
    expect(q.zoneFactor).toBe(1.2);
    expect(q.subtotal).toBe(132);
  });

  it("scales linearly with size", () => {
    const baseReq = {
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 10,
      urgency: "next_day" as const,
    };
    const s = calculatePrice({ ...baseReq, size: "S" });
    const m = calculatePrice({ ...baseReq, size: "M" });
    const l = calculatePrice({ ...baseReq, size: "L" });
    const xl = calculatePrice({ ...baseReq, size: "XL" });
    expect(m.subtotal).toBeCloseTo(s.subtotal * SIZE_FACTORS.M, 2);
    expect(l.subtotal).toBeCloseTo(s.subtotal * SIZE_FACTORS.L, 2);
    expect(xl.subtotal).toBeCloseTo(s.subtotal * SIZE_FACTORS.XL, 2);
  });

  it("scales by urgency factor", () => {
    const baseReq = {
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 5,
      size: "S" as const,
    };
    const standard = calculatePrice({ ...baseReq, urgency: "next_day" });
    const sameDay = calculatePrice({ ...baseReq, urgency: "same_day" });
    const express = calculatePrice({ ...baseReq, urgency: "express" });
    const economy = calculatePrice({ ...baseReq, urgency: "economy" });
    expect(sameDay.subtotal).toBeCloseTo(standard.subtotal * URGENCY_FACTORS.same_day, 2);
    expect(express.subtotal).toBeCloseTo(standard.subtotal * URGENCY_FACTORS.express, 2);
    expect(economy.subtotal).toBeCloseTo(standard.subtotal * URGENCY_FACTORS.economy, 2);
  });

  it("applies surge when provided", () => {
    const baseReq = {
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 5,
      size: "S" as const,
      urgency: "next_day" as const,
    };
    const flat = calculatePrice(baseReq);
    const surged = calculatePrice({ ...baseReq, surge: 1.5 });
    expect(surged.subtotal).toBeCloseTo(flat.subtotal * 1.5, 2);
  });

  it("adds fragile surcharge after multiplicative core", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 0,
      size: "S",
      urgency: "next_day",
      fragile: true,
    });
    expect(q.fragileSurcharge).toBe(15);
    expect(q.subtotal).toBe(20 + 15);
  });

  it("computes insurance as 2% of declared value with a min of 5", () => {
    const cheap = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 0,
      size: "S",
      urgency: "next_day",
      insurance: true,
      declaredValue: 100,
    });
    expect(cheap.insuranceFee).toBe(5); // 2 → min 5

    const pricey = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 0,
      size: "S",
      urgency: "next_day",
      insurance: true,
      declaredValue: 1000,
    });
    expect(pricey.insuranceFee).toBe(20);
  });

  it("ignores insurance flag when declaredValue is missing", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 0,
      size: "S",
      urgency: "next_day",
      insurance: true,
    });
    expect(q.insuranceFee).toBe(0);
  });

  it("clamps negative distance to 0", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: -50,
      size: "S",
      urgency: "next_day",
    });
    expect(q.distanceCost).toBe(0);
  });

  it("VAT is computed on the subtotal at 17%", () => {
    const q = calculatePrice({
      pickupZone: afula,
      deliveryZone: afula,
      distanceKm: 10,
      size: "M",
      urgency: "next_day",
    });
    expect(q.vat).toBeCloseTo(q.subtotal * VAT_RATE, 1);
    expect(q.total).toBe(Math.round(q.subtotal + q.vat));
  });

  it("crossing zones takes the higher multiplier", () => {
    const a = calculatePrice({
      pickupZone: afula,
      deliveryZone: gilboa,
      distanceKm: 5,
      size: "S",
      urgency: "next_day",
    });
    expect(a.zoneFactor).toBe(1.1);

    const b = calculatePrice({
      pickupZone: afula,
      deliveryZone: beitShean,
      distanceKm: 5,
      size: "S",
      urgency: "next_day",
    });
    expect(b.zoneFactor).toBe(1.2);
  });

  it("express M to בית שאן is sane (under ₪500 for 30km)", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: beitShean,
      distanceKm: 30,
      size: "M",
      urgency: "express",
    });
    expect(q.total).toBeGreaterThan(50);
    expect(q.total).toBeLessThan(500);
  });

  it("breakdown carries human-readable zone names + formula", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: afula,
      distanceKm: 10,
      size: "S",
      urgency: "next_day",
    });
    expect(q.breakdown.pickupZone).toBe("חיפה");
    expect(q.breakdown.deliveryZone).toBe("עפולה");
    expect(q.breakdown.formula).toContain("VAT");
  });

  it("XL express on long route is non-zero and finite", () => {
    const q = calculatePrice({
      pickupZone: haifa,
      deliveryZone: beitShean,
      distanceKm: 60,
      size: "XL",
      urgency: "express",
      fragile: true,
      insurance: true,
      declaredValue: 5000,
    });
    expect(Number.isFinite(q.total)).toBe(true);
    expect(q.total).toBeGreaterThan(0);
    expect(q.fragileSurcharge).toBe(15);
    expect(q.insuranceFee).toBe(100);
  });

  it("economy is cheaper than next_day", () => {
    const baseReq = {
      pickupZone: haifa,
      deliveryZone: haifa,
      distanceKm: 5,
      size: "S" as const,
    };
    const economy = calculatePrice({ ...baseReq, urgency: "economy" });
    const standard = calculatePrice({ ...baseReq, urgency: "next_day" });
    expect(economy.total).toBeLessThan(standard.total);
  });
});
