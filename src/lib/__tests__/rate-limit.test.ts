import { describe, it, expect } from "vitest";
import { rateLimit, getRequestIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to max tokens, then blocks", () => {
    const key = `test-burst-${Math.random()}`;
    const cfg = { max: 3, refillPerMinute: 60 };

    expect(rateLimit(key, cfg).allowed).toBe(true);
    expect(rateLimit(key, cfg).allowed).toBe(true);
    expect(rateLimit(key, cfg).allowed).toBe(true);
    expect(rateLimit(key, cfg).allowed).toBe(false);
  });

  it("returns retryAfterSec when blocked", () => {
    const key = `test-retry-${Math.random()}`;
    const cfg = { max: 1, refillPerMinute: 60 };
    rateLimit(key, cfg);
    const second = rateLimit(key, cfg);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates separate keys", () => {
    const cfg = { max: 1, refillPerMinute: 60 };
    expect(rateLimit(`a-${Math.random()}`, cfg).allowed).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, cfg).allowed).toBe(true);
  });
});

describe("getRequestIp", () => {
  it("reads x-forwarded-for first entry", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getRequestIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getRequestIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no headers", () => {
    const req = new Request("http://x");
    expect(getRequestIp(req)).toBe("unknown");
  });
});
