import { describe, it, expect } from "vitest";
import { normalizePhone, WhatsAppSender } from "../whatsapp";

describe("normalizePhone", () => {
  it("converts Israeli 0-prefix to 972 prefix", () => {
    expect(normalizePhone("050-1234567")).toBe("972501234567");
  });
  it("strips + from E.164", () => {
    expect(normalizePhone("+972501234567")).toBe("972501234567");
  });
  it("keeps already-normalized number", () => {
    expect(normalizePhone("972501234567")).toBe("972501234567");
  });
  it("returns null for empty", () => {
    expect(normalizePhone("")).toBeNull();
  });
});

describe("WhatsAppSender stub mode", () => {
  it("returns ok with stub external id", async () => {
    const sender = new WhatsAppSender(undefined, undefined);
    const r = await sender.send({
      template: "order.delivered",
      recipient: "972501234567",
      channel: "whatsapp",
      payload: { orderNumber: "DEL-1" },
      eventId: "evt_1",
    });
    expect(r.ok).toBe(true);
    expect(r.externalId).toMatch(/^wa_stub_/);
  });

  it("rejects invalid phone", async () => {
    const sender = new WhatsAppSender(undefined, undefined);
    const r = await sender.send({
      template: "order.delivered",
      recipient: "abc",
      channel: "whatsapp",
      payload: {},
      eventId: "evt_2",
    });
    expect(r.ok).toBe(false);
  });
});
