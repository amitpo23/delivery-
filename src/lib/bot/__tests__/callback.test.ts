import { describe, it, expect } from "vitest";
import {
  decodeCallback,
  driverKeyboardForStatus,
  encodeCallback,
  DRIVER_ACTION_TO_STATUS,
} from "../callback";

const SAMPLE_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("encodeCallback / decodeCallback", () => {
  it("round-trips every action", () => {
    for (const action of ["pickup", "transit", "deliver", "return", "issue"] as const) {
      const encoded = encodeCallback(SAMPLE_UUID, action);
      const decoded = decodeCallback(encoded);
      expect(decoded).toEqual({ orderId: SAMPLE_UUID, action });
    }
  });

  it("stays under Telegram's 64-byte callback_data cap", () => {
    const encoded = encodeCallback(SAMPLE_UUID, "transit");
    expect(Buffer.byteLength(encoded, "utf8")).toBeLessThanOrEqual(64);
  });

  it("rejects malformed callbacks", () => {
    expect(decodeCallback("")).toBeNull();
    expect(decodeCallback("drv:bad-uuid:pickup")).toBeNull();
    expect(decodeCallback(`drv:${SAMPLE_UUID}:not-an-action`)).toBeNull();
    expect(decodeCallback(`other:${SAMPLE_UUID}:pickup`)).toBeNull();
    expect(decodeCallback(`drv:${SAMPLE_UUID}`)).toBeNull();
    expect(decodeCallback(`drv:${SAMPLE_UUID}:pickup:extra`)).toBeNull();
  });
});

describe("DRIVER_ACTION_TO_STATUS", () => {
  it("maps actions to allowed downstream statuses (no 'issue' here — it doesn't move state)", () => {
    expect(DRIVER_ACTION_TO_STATUS.pickup).toBe("picked_up");
    expect(DRIVER_ACTION_TO_STATUS.transit).toBe("in_transit");
    expect(DRIVER_ACTION_TO_STATUS.deliver).toBe("delivered");
    expect(DRIVER_ACTION_TO_STATUS.return).toBe("returned");
  });
});

describe("driverKeyboardForStatus", () => {
  it("returns pickup + issue buttons for assigned", () => {
    const kb = driverKeyboardForStatus(SAMPLE_UUID, "assigned");
    expect(kb).not.toBeNull();
    const flat = kb!.inline_keyboard.flat();
    expect(flat.map((b) => b.callback_data)).toEqual([
      `drv:${SAMPLE_UUID}:pickup`,
      `drv:${SAMPLE_UUID}:issue`,
    ]);
  });

  it("returns transit + issue buttons for picked_up", () => {
    const kb = driverKeyboardForStatus(SAMPLE_UUID, "picked_up");
    expect(kb).not.toBeNull();
    const codes = kb!.inline_keyboard.flat().map((b) => b.callback_data);
    expect(codes).toContain(`drv:${SAMPLE_UUID}:transit`);
    expect(codes).toContain(`drv:${SAMPLE_UUID}:issue`);
  });

  it("returns deliver + return + issue for in_transit", () => {
    const kb = driverKeyboardForStatus(SAMPLE_UUID, "in_transit");
    expect(kb).not.toBeNull();
    const codes = kb!.inline_keyboard.flat().map((b) => b.callback_data);
    expect(codes).toContain(`drv:${SAMPLE_UUID}:deliver`);
    expect(codes).toContain(`drv:${SAMPLE_UUID}:return`);
    expect(codes).toContain(`drv:${SAMPLE_UUID}:issue`);
  });

  it("returns null for terminal statuses", () => {
    expect(driverKeyboardForStatus(SAMPLE_UUID, "delivered")).toBeNull();
    expect(driverKeyboardForStatus(SAMPLE_UUID, "cancelled")).toBeNull();
    expect(driverKeyboardForStatus(SAMPLE_UUID, "returned")).toBeNull();
    expect(driverKeyboardForStatus(SAMPLE_UUID, "pending")).toBeNull();
    expect(driverKeyboardForStatus(SAMPLE_UUID, "confirmed")).toBeNull();
  });
});
