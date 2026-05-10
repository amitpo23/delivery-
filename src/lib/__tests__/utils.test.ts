import { describe, it, expect } from "vitest";
import { cn, formatDate, formatPrice, generateOrderNumber } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatPrice", () => {
  it("formats ILS without decimals", () => {
    const out = formatPrice(99);
    expect(out).toContain("99");
    expect(out).toContain("₪");
  });
});

describe("formatDate", () => {
  // Guard against shadcn (or any other tool) silently overwriting utils.ts
  // and dropping formatDate — which is called from /track/[orderNumber]
  // and would only surface as a runtime crash on the tracking page.
  it("formats a date into he-IL dd.mm.yyyy with hh:mm", () => {
    // he-IL renders as "15.06.2024, 13:00" (dot separators, not slashes).
    const out = formatDate("2024-06-15T10:00:00Z");
    expect(out).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it("accepts a Date instance as well as a string", () => {
    const out = formatDate(new Date("2024-06-15T10:00:00Z"));
    expect(out).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});

describe("generateOrderNumber", () => {
  it("starts with DEL- and is unique across calls", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).toMatch(/^DEL-/);
    expect(a).not.toBe(b);
  });
});
