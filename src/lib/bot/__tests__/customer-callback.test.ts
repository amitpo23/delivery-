import { describe, it, expect } from "vitest";
import {
  decodeAnyCallback,
  customerKeyboardForStatus,
  encodeCustomerCallback,
} from "../callback";
import { handleCustomerCallback } from "../handle-customer-callback";
import { isTrackingNumber, renderStatusCard } from "../customer-tracking";
import type { OrderStatus } from "@/types";

const ORDER_UUID = "550e8400-e29b-41d4-a716-446655440000";
const CUSTOMER_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CHAT_ID = "12345";

describe("decodeAnyCallback", () => {
  it("parses customer namespace", () => {
    const decoded = decodeAnyCallback(`cust:${ORDER_UUID}:refresh`);
    expect(decoded).toEqual({ kind: "customer", orderId: ORDER_UUID, action: "refresh" });
  });
  it("parses driver namespace", () => {
    const decoded = decodeAnyCallback(`drv:${ORDER_UUID}:pickup`);
    expect(decoded).toEqual({ kind: "driver", orderId: ORDER_UUID, action: "pickup" });
  });
  it("rejects unknown namespaces", () => {
    expect(decodeAnyCallback(`xyz:${ORDER_UUID}:refresh`)).toBeNull();
    expect(decodeAnyCallback(`cust:${ORDER_UUID}:unknown`)).toBeNull();
    expect(decodeAnyCallback("garbage")).toBeNull();
  });
});

describe("customerKeyboardForStatus", () => {
  it("includes refresh + chat always", () => {
    for (const status of ["pending", "confirmed", "assigned", "picked_up", "delivered"] as OrderStatus[]) {
      const kb = customerKeyboardForStatus(ORDER_UUID, status);
      const codes = kb.inline_keyboard.flat().map((b) => b.callback_data);
      expect(codes).toContain(`cust:${ORDER_UUID}:refresh`);
      expect(codes).toContain(`cust:${ORDER_UUID}:chat`);
    }
  });

  it("includes cancel only on cancellable statuses", () => {
    for (const status of ["pending", "confirmed", "assigned"] as OrderStatus[]) {
      const codes = customerKeyboardForStatus(ORDER_UUID, status)
        .inline_keyboard.flat()
        .map((b) => b.callback_data);
      expect(codes).toContain(`cust:${ORDER_UUID}:cancel`);
    }
    for (const status of ["picked_up", "in_transit", "delivered", "cancelled"] as OrderStatus[]) {
      const codes = customerKeyboardForStatus(ORDER_UUID, status)
        .inline_keyboard.flat()
        .map((b) => b.callback_data);
      expect(codes).not.toContain(`cust:${ORDER_UUID}:cancel`);
    }
  });
});

describe("isTrackingNumber + renderStatusCard", () => {
  it("matches DEL-XXX patterns", () => {
    expect(isTrackingNumber("DEL-123ABC")).toBe(true);
    expect(isTrackingNumber("del-abc-123")).toBe(true);
    expect(isTrackingNumber("DEL-")).toBe(false);
    expect(isTrackingNumber("DELIVERY")).toBe(false);
    expect(isTrackingNumber("שלום")).toBe(false);
  });

  it("renders Hebrew card with status label", () => {
    const card = renderStatusCard({
      order_number: "DEL-200",
      status: "in_transit",
      pickup_address: "חיפה, החלוץ 5",
      delivery_address: "עפולה, הרצל 10",
      time_window: "10:00-12:00",
      delivered_at: null,
      estimated_price: 49,
    });
    expect(card).toContain("DEL-200");
    expect(card).toContain("בדרך");
    expect(card).toContain("חיפה");
    expect(card).toContain("עפולה");
    expect(card).toContain("10:00-12:00");
    expect(card).toContain("49");
  });
});

interface MockOpts {
  order?: {
    id: string;
    order_number: string;
    status: OrderStatus;
    booker_phone: string | null;
    customer_id: string | null;
    pickup_address?: string;
    delivery_address?: string;
    time_window?: string | null;
    delivered_at?: string | null;
    estimated_price?: number | null;
  } | null;
  profileForChat?: { id: string; phone: string | null } | null;
  duplicateCallbackIds?: Set<string>;
  failOrderUpdate?: boolean;
}

function makeSupabase(opts: MockOpts = {}) {
  const seenCallbacks = new Set<string>([...(opts.duplicateCallbackIds ?? [])]);
  const inserted: Array<{ table: string; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: string; values: Record<string, unknown>; conditions: Array<[string, unknown]> }> = [];

  function from(table: string) {
    return {
      insert(values: Record<string, unknown>) {
        if (table === "bot_callback_log") {
          const id = String(values.callback_id);
          if (seenCallbacks.has(id)) {
            return Promise.resolve({ data: null, error: { code: "23505", message: "dup" } });
          }
          seenCallbacks.add(id);
        }
        inserted.push({ table, values });
        return Promise.resolve({ data: null, error: null });
      },
      update(values: Record<string, unknown>) {
        const localCtx = { conditions: [] as Array<[string, unknown]> };
        const eqChain: { eq: (k: string, v: unknown) => typeof eqChain; then: (onF: (v: unknown) => unknown) => Promise<unknown> } = {
          eq(k: string, v: unknown) {
            localCtx.conditions.push([k, v]);
            return eqChain;
          },
          then(onF: (v: unknown) => unknown) {
            updated.push({ table, values, conditions: localCtx.conditions });
            const err = table === "orders" && opts.failOrderUpdate ? { message: "boom" } : null;
            return Promise.resolve({ data: null, error: err }).then(onF);
          },
        };
        return eqChain;
      },
      select(_cols: string) {
        const ctx = { conditions: [] as Array<[string, unknown]> };
        const chain = {
          eq(k: string, v: unknown) {
            ctx.conditions.push([k, v]);
            return chain;
          },
          maybeSingle: async () => {
            if (table === "profiles") {
              const cond = ctx.conditions.find(([k]) => k === "telegram_chat_id");
              if (cond && cond[1] === CHAT_ID) {
                return { data: opts.profileForChat ?? null, error: null };
              }
              return { data: null, error: null };
            }
            if (table === "orders") {
              if (opts.order === null) return { data: null, error: null };
              return { data: opts.order, error: null };
            }
            return { data: null, error: null };
          },
        };
        return chain;
      },
    };
  }
  return { client: { from } as unknown as Parameters<typeof handleCustomerCallback>[1], inserted, updated };
}

describe("handleCustomerCallback - refresh", () => {
  it("returns the updated card", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-300",
        status: "assigned",
        booker_phone: "972501234567",
        customer_id: CUSTOMER_UUID,
        pickup_address: "חיפה",
        delivery_address: "עפולה",
        time_window: null,
        delivered_at: null,
        estimated_price: 50,
      },
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-refresh",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "refresh"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
    expect(out.replyText).toContain("DEL-300");
    expect(out.replyMarkup).toBeDefined();
  });
});

describe("handleCustomerCallback - cancel", () => {
  it("rejects when chat is not bound to any profile", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-400",
        status: "pending",
        booker_phone: "972501234567",
        customer_id: null,
      },
      profileForChat: null,
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-anon-cancel",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "cancel"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("chat_not_bound");
    expect(sb.updated.some((r) => r.table === "orders")).toBe(false);
  });

  it("rejects when phone doesn't match booker_phone", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-500",
        status: "pending",
        booker_phone: "972501111111",
        customer_id: null,
      },
      profileForChat: { id: "other-user", phone: "972502222222" },
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-mismatch",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "cancel"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("phone_mismatch");
  });

  it("cancels when phone matches (handles 0XXX vs 972XXX)", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-600",
        status: "pending",
        booker_phone: "972501234567",
        customer_id: null,
        pickup_address: "חיפה",
        delivery_address: "עפולה",
      },
      profileForChat: { id: "user-id", phone: "0501234567" },
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-cancel-ok",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "cancel"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
    const orderUpdate = sb.updated.find((r) => r.table === "orders");
    expect(orderUpdate?.values.status).toBe("cancelled");
    // status precondition guards against double-cancel races.
    expect(orderUpdate?.conditions).toContainEqual(["status", "pending"]);
  });

  it("cancels when customer_id matches", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-700",
        status: "assigned",
        booker_phone: null,
        customer_id: CUSTOMER_UUID,
        pickup_address: "חיפה",
        delivery_address: "עפולה",
      },
      profileForChat: { id: CUSTOMER_UUID, phone: null },
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-cancel-customer",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "cancel"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
  });

  it("rejects cancel on non-cancellable statuses", async () => {
    const sb = makeSupabase({
      order: {
        id: ORDER_UUID,
        order_number: "DEL-800",
        status: "in_transit",
        booker_phone: "972501234567",
        customer_id: null,
      },
      profileForChat: { id: "user", phone: "972501234567" },
    });
    const out = await handleCustomerCallback(
      {
        callbackId: "cb-late-cancel",
        chatId: CHAT_ID,
        data: encodeCustomerCallback(ORDER_UUID, "cancel"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("not_cancellable");
  });

  it("returns duplicate on repeat callback_id", async () => {
    const sb = makeSupabase({
      duplicateCallbackIds: new Set(["cb-dup"]),
      order: {
        id: ORDER_UUID,
        order_number: "DEL-900",
        status: "pending",
        booker_phone: "972501234567",
        customer_id: null,
      },
      profileForChat: { id: "user", phone: "972501234567" },
    });
    const out = await handleCustomerCallback(
      { callbackId: "cb-dup", chatId: CHAT_ID, data: encodeCustomerCallback(ORDER_UUID, "cancel") },
      sb.client,
    );
    expect(out.status).toBe("duplicate");
    expect(sb.updated.some((r) => r.table === "orders")).toBe(false);
  });
});
