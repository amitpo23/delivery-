import { describe, it, expect } from "vitest";
import { cn, formatPrice, generateOrderNumber } from "@/lib/utils";

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

describe("generateOrderNumber", () => {
  it("starts with DEL- and is unique across calls", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).toMatch(/^DEL-/);
    expect(a).not.toBe(b);
  });
});
