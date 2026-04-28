import { describe, it, expect } from "vitest";
import { haversineKm } from "@/lib/geo/distance";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    const p = { lat: 32.794, lng: 34.989 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("computes Haifa → Afula great-circle ~35km", () => {
    // Road distance is ~50km; Haversine is shorter — that's fine because
    // the engine uses Math.max(geo, zoneFloor, advisory) so the floor wins.
    const haifa = { lat: 32.794, lng: 34.989 };
    const afula = { lat: 32.609, lng: 35.289 };
    const d = haversineKm(haifa, afula);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(40);
  });

  it("is symmetric", () => {
    const a = { lat: 32.5, lng: 35.0 };
    const b = { lat: 32.8, lng: 35.5 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5);
  });

  it("handles antipodal-ish without NaN", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 180 };
    const d = haversineKm(a, b);
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(19_000);
  });
});
