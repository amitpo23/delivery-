import { describe, it, expect } from "vitest";
import { isDriverTransitionAllowed, DRIVER_TRANSITIONS } from "@/lib/orders/transitions";
import type { OrderStatus } from "@/types";

describe("isDriverTransitionAllowed", () => {
  it("allows the happy-path flow", () => {
    expect(isDriverTransitionAllowed("assigned", "picked_up")).toBe(true);
    expect(isDriverTransitionAllowed("picked_up", "in_transit")).toBe(true);
    expect(isDriverTransitionAllowed("in_transit", "delivered")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isDriverTransitionAllowed("delivered", "in_transit")).toBe(false);
    expect(isDriverTransitionAllowed("picked_up", "assigned")).toBe(false);
    expect(isDriverTransitionAllowed("in_transit", "picked_up")).toBe(false);
  });

  it("rejects skipping ahead", () => {
    expect(isDriverTransitionAllowed("assigned", "delivered")).toBe(false);
    expect(isDriverTransitionAllowed("assigned", "in_transit")).toBe(false);
  });

  it("treats terminal states as no-go for further transitions", () => {
    const terminals: OrderStatus[] = ["delivered", "cancelled", "returned"];
    for (const from of terminals) {
      expect(DRIVER_TRANSITIONS[from]).toEqual([]);
    }
  });

  it("does not allow drivers to act on pending/confirmed (admin job)", () => {
    expect(isDriverTransitionAllowed("pending", "assigned")).toBe(false);
    expect(isDriverTransitionAllowed("confirmed", "assigned")).toBe(false);
  });

  it("permits driver-initiated cancellation from active states only", () => {
    expect(isDriverTransitionAllowed("assigned", "cancelled")).toBe(true);
    expect(isDriverTransitionAllowed("picked_up", "cancelled")).toBe(true);
    expect(isDriverTransitionAllowed("in_transit", "cancelled")).toBe(true);
    expect(isDriverTransitionAllowed("pending", "cancelled")).toBe(false);
    expect(isDriverTransitionAllowed("delivered", "cancelled")).toBe(false);
  });
});
