import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration tests for /api/pricing/quote.
 *
 * Mock surface is deliberately narrow:
 *   - geocodeAddress: stub to null (forces zone-floor distance, the
 *     deterministic path) so price assertions are stable.
 *   - rate-limit module is real (in-memory) but each test uses a unique
 *     IP so the bucket starts fresh.
 *
 * Pricing engine + zones are NOT mocked — those are already covered by
 * unit tests, and exercising them here gives integration confidence.
 */

vi.mock("@/lib/geocoding/google", () => ({
  geocodeAddress: vi.fn(async () => null),
}));

import { POST } from "../route";

function makeReq(
  body: unknown,
  ip = `1.2.3.${Math.floor(Math.random() * 250) + 1}`
) {
  return new Request("http://localhost/api/pricing/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/pricing/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(makeReq("not-json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/);
  });

  it("returns 400 with zod issues when fields are missing", async () => {
    const res = await POST(
      makeReq({ pickupAddress: "חיפה" }) // missing delivery, size, urgency
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
    expect(json.issues.length).toBeGreaterThan(0);
  });

  it("returns 422 with coverage list when address is outside service area", async () => {
    const res = await POST(
      makeReq({
        pickupAddress: "Tel Aviv, Rothschild 1",
        deliveryAddress: "Jerusalem, Jaffa 1",
        size: "S",
        urgency: "next_day",
      })
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/outside coverage/i);
    expect(json.coverage).toContain("חיפה");
    expect(json.coverage).toContain("עפולה");
    expect(Array.isArray(json.unresolved)).toBe(true);
  });

  it("returns a quote with the expected shape on the happy path (Haifa→Afula, S, next_day)", async () => {
    const res = await POST(
      makeReq({
        pickupAddress: "חיפה, רחוב הנמל 12",
        deliveryAddress: "עפולה, ויצמן 5",
        size: "S",
        urgency: "next_day",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.quote).toMatchObject({
      currency: "ILS",
      total: expect.any(Number),
      subtotal: expect.any(Number),
      vat: expect.any(Number),
    });
    expect(json.quote.total).toBeGreaterThan(0);
    expect(json.quote.total).toBeCloseTo(
      json.quote.subtotal + json.quote.vat,
      2
    );
    expect(json.distanceSource).toBe("zone-floor");
    expect(typeof json.distanceKm).toBe("number");
    expect(json.distanceKm).toBeGreaterThan(0);
  });

  it("urgency=express costs more than urgency=economy for the same route", async () => {
    const base = {
      pickupAddress: "חיפה",
      deliveryAddress: "עפולה",
      size: "M",
    };
    const expressRes = await POST(makeReq({ ...base, urgency: "express" }));
    const economyRes = await POST(makeReq({ ...base, urgency: "economy" }));
    expect(expressRes.status).toBe(200);
    expect(economyRes.status).toBe(200);
    const express = await expressRes.json();
    const economy = await economyRes.json();
    expect(express.quote.total).toBeGreaterThan(economy.quote.total);
  });

  it("size=XL costs more than size=S for the same route + urgency", async () => {
    const base = {
      pickupAddress: "חיפה",
      deliveryAddress: "עפולה",
      urgency: "next_day",
    };
    const sRes = await POST(makeReq({ ...base, size: "S" }));
    const xlRes = await POST(makeReq({ ...base, size: "XL" }));
    const s = await sRes.json();
    const xl = await xlRes.json();
    expect(xl.quote.total).toBeGreaterThan(s.quote.total);
  });

  it("insurance with declaredValue adds an insurance fee", async () => {
    const base = {
      pickupAddress: "חיפה",
      deliveryAddress: "עפולה",
      size: "S",
      urgency: "next_day",
    };
    const noIns = await (await POST(makeReq(base))).json();
    const ins = await (
      await POST(makeReq({ ...base, insurance: true, declaredValue: 500 }))
    ).json();
    expect(ins.quote.insuranceFee).toBeGreaterThan(0);
    expect(ins.quote.total).toBeGreaterThan(noIns.quote.total);
  });

  it("rate-limits an aggressive caller from a single IP after 60/min", async () => {
    // The route caps at 60 quotes/min/IP. Hit it 65 times from one IP and
    // assert the last few responses are 429.
    const ip = "9.9.9.9";
    const body = {
      pickupAddress: "חיפה",
      deliveryAddress: "עפולה",
      size: "S",
      urgency: "next_day",
    };

    let last200 = 0;
    let last429 = 0;
    for (let i = 0; i < 65; i++) {
      const res = await POST(makeReq(body, ip));
      if (res.status === 200) last200++;
      else if (res.status === 429) last429++;
    }

    expect(last200).toBeLessThanOrEqual(60);
    expect(last429).toBeGreaterThanOrEqual(1);
  });
});
