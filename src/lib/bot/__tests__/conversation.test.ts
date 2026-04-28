import { describe, it, expect } from "vitest";
import { handle, type BotState, type BotData } from "../conversation";

function step(state: BotState, data: BotData, message: string) {
  return handle({ state, data, message });
}

describe("bot conversation", () => {
  it("idle → menu shows welcome", () => {
    const out = step("idle", {}, "anything");
    expect(out.newState).toBe("menu");
    expect(out.replies.join("\n")).toContain("ברוכים הבאים");
  });

  it("'בטל' resets at any point", () => {
    const out = step("delivery_phone", { pickupAddress: "חיפה", size: "M" }, "בטל");
    expect(out.newState).toBe("menu");
    expect(out.newData).toEqual({});
  });

  it("happy path produces a prefill URL", () => {
    let s = step("menu", {}, "1");
    expect(s.newState).toBe("pickup_address");

    s = step(s.newState, s.newData, "חיפה הרצל 5");
    expect(s.newState).toBe("delivery_address");

    s = step(s.newState, s.newData, "עפולה רחוב הנשיא 12");
    expect(s.newState).toBe("size");

    s = step(s.newState, s.newData, "2");
    expect(s.newState).toBe("urgency");
    expect(s.newData.size).toBe("M");

    s = step(s.newState, s.newData, "3");
    expect(s.newState).toBe("booker_name");
    expect(s.newData.urgency).toBe("next_day");

    s = step(s.newState, s.newData, "ישראל ישראלי");
    expect(s.newState).toBe("pickup_phone");

    s = step(s.newState, s.newData, "050-1234567");
    expect(s.newState).toBe("delivery_phone");

    s = step(s.newState, s.newData, "052-7654321");
    expect(s.newState).toBe("confirm");
    expect(s.replies.join("\n")).toContain("חיפה הרצל 5");

    s = step(s.newState, s.newData, "כן");
    expect(s.newState).toBe("done");
    expect(s.prefillUrl).toBeDefined();
    expect(s.prefillUrl).toContain("from=");
    expect(s.prefillUrl).toContain("to=");
    expect(s.prefillUrl).toContain("size=M");
    expect(s.prefillUrl).toContain("urgency=next_day");
  });

  it("rejects pickup outside coverage", () => {
    const s = step("pickup_address", {}, "תל אביב, דיזנגוף 99");
    expect(s.newState).toBe("pickup_address");
    expect(s.replies.join("\n")).toContain("מחוץ לאזור");
  });

  it("rejects invalid phone", () => {
    const s = step("pickup_phone", { pickupAddress: "חיפה" }, "abc");
    expect(s.newState).toBe("pickup_phone");
    expect(s.replies.join("\n")).toContain("לא תקין");
  });

  it("rejects size out of range", () => {
    const s = step("size", { pickupAddress: "חיפה" }, "9");
    expect(s.newState).toBe("size");
  });

  it("track branch returns tracking URL when given a valid number", () => {
    const s = step("menu", {}, "DEL-ABC123");
    expect(s.trackingUrl).toContain("/track/DEL-ABC123");
  });

  it("done state restarts on next message", () => {
    const s = step("done", { pickupAddress: "חיפה" }, "שלום");
    expect(s.newState).toBe("menu");
    expect(s.newData).toEqual({});
  });

  it("requires explicit confirmation before done", () => {
    const s = step(
      "confirm",
      {
        pickupAddress: "חיפה",
        deliveryAddress: "עפולה",
        size: "M",
        urgency: "next_day",
        bookerName: "Test",
        pickupPhone: "050-1111111",
        deliveryPhone: "050-2222222",
      },
      "אולי",
    );
    expect(s.newState).toBe("confirm");
  });
});
