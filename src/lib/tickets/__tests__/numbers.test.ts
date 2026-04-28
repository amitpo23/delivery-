import { describe, it, expect } from "vitest";
import { generateTicketNumber } from "../numbers";

describe("generateTicketNumber", () => {
  it("starts with TIK- and is unique across calls", () => {
    const a = generateTicketNumber();
    const b = generateTicketNumber();
    expect(a).toMatch(/^TIK-/);
    expect(b).toMatch(/^TIK-/);
    expect(a).not.toBe(b);
  });

  it("uses uppercase alphanumerics only after the TIK- prefix", () => {
    const t = generateTicketNumber();
    expect(t.slice(4)).toMatch(/^[A-Z0-9-]+$/);
  });
});
