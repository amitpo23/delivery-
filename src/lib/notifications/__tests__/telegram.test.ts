import { describe, it, expect } from "vitest";
import { TelegramSender } from "../telegram";

describe("TelegramSender stub mode", () => {
  it("returns ok with stub external id when no token", async () => {
    const sender = new TelegramSender(undefined);
    const r = await sender.send({
      template: "order.assigned.driver",
      recipient: "12345",
      channel: "telegram",
      payload: { orderNumber: "DEL-1", pickupAddress: "חיפה", deliveryAddress: "עפולה" },
      eventId: "evt_1",
    });
    expect(r.ok).toBe(true);
    expect(r.externalId).toMatch(/^tg_stub_/);
  });
});
