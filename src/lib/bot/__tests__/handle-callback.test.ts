import { describe, it, expect } from "vitest";
import { handleDriverCallback } from "../handle-callback";
import { encodeCallback } from "../callback";
import type { OrderStatus } from "@/types";

const ORDER_UUID = "550e8400-e29b-41d4-a716-446655440000";
const DRIVER_UUID = "11111111-1111-1111-1111-111111111111";
const OTHER_DRIVER_UUID = "22222222-2222-2222-2222-222222222222";
const DRIVER_CHAT = "987654321";

interface MockOrder {
  id: string;
  status: OrderStatus;
  driver_id: string | null;
  order_number: string;
}

interface MockOpts {
  order?: MockOrder | null;
  driverIdForChat?: string | null;
  duplicateCallbackIds?: Set<string>;
  failOrderUpdate?: boolean;
}

/**
 * Supabase mock that's just rich enough for handle-callback's calls:
 *   from('bot_callback_log').insert(...)         — claim
 *   from('bot_callback_log').update(...).eq(...) — finalize
 *   from('drivers').select('id').eq('telegram_chat_id', ...).maybeSingle()
 *   from('orders').select(...).eq('id', ...).maybeSingle()
 *   from('orders').update(...).eq(...).eq(...).eq(...)
 *   from('order_status_history').insert(...)
 */
function makeSupabase(opts: MockOpts = {}) {
  const seenCallbacks = new Set<string>([...(opts.duplicateCallbackIds ?? [])]);
  const inserted: Array<{ table: string; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: string; values: Record<string, unknown>; conditions: Array<[string, unknown]> }> = [];

  function from(table: string) {
    const ctx = { conditions: [] as Array<[string, unknown]> };

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
        const finish = (err: unknown = null) => Promise.resolve({ data: null, error: err });
        const localCtx = { conditions: [...ctx.conditions] };
        const eqChain: {
          eq: (k: string, v: unknown) => typeof eqChain;
          then: (onF: (v: unknown) => unknown) => Promise<unknown>;
        } = {
          eq(k: string, v: unknown) {
            localCtx.conditions.push([k, v]);
            return eqChain;
          },
          then(onF: (v: unknown) => unknown) {
            updated.push({ table, values, conditions: localCtx.conditions });
            const err =
              table === "orders" && opts.failOrderUpdate
                ? { message: "boom" }
                : null;
            return finish(err).then(onF);
          },
        };
        return eqChain;
      },

      select(_cols: string) {
        const localCtx = { conditions: [...ctx.conditions] };
        type Chain = {
          eq: (k: string, v: unknown) => Chain;
          not: (k: string, op: string, v: unknown) => Chain;
          maybeSingle: () => Promise<{ data: unknown; error: null }>;
          then: (onF: (v: { data: unknown; error: null }) => unknown) => Promise<unknown>;
        };
        const chain: Chain = {
          eq(k: string, v: unknown) {
            localCtx.conditions.push([k, v]);
            return chain;
          },
          not(_k: string, _op: string, _v: unknown) {
            return chain;
          },
          maybeSingle: async () => {
            if (table === "drivers") {
              const chatCondition = localCtx.conditions.find(([k]) => k === "telegram_chat_id");
              if (chatCondition && chatCondition[1] === DRIVER_CHAT && opts.driverIdForChat) {
                return { data: { id: opts.driverIdForChat }, error: null };
              }
              return { data: null, error: null };
            }
            if (table === "orders") {
              if (opts.order === null) return { data: null, error: null };
              return { data: opts.order, error: null };
            }
            if (table === "profiles") {
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },
          then(onF: (v: { data: unknown; error: null }) => unknown) {
            // Support `await supabase.from(...).select(...).eq(...).not(...)` (no maybeSingle).
            // Used by notifyAdminsOfIssue to fan out to all admin chat_ids.
            return Promise.resolve({ data: [] as unknown[], error: null }).then(onF);
          },
        };
        return chain;
      },
    };
  }

  return { client: { from } as unknown as Parameters<typeof handleDriverCallback>[1], inserted, updated, seenCallbacks };
}

describe("handleDriverCallback", () => {
  it("rejects malformed callback_data", async () => {
    const sb = makeSupabase();
    const out = await handleDriverCallback(
      { callbackId: "cb1", chatId: DRIVER_CHAT, data: "garbage" },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("invalid_data");
    // Even on rejection we want a row in bot_callback_log so admins can see the attempt.
    expect(sb.inserted.some((r) => r.table === "bot_callback_log")).toBe(true);
  });

  it("treats a repeat callback_id as duplicate (idempotency)", async () => {
    const sb = makeSupabase({
      duplicateCallbackIds: new Set(["cb-already-seen"]),
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "assigned", driver_id: DRIVER_UUID, order_number: "DEL-100" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-already-seen",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("duplicate");
    // No order update should have happened on the duplicate path.
    expect(sb.updated.some((r) => r.table === "orders")).toBe(false);
  });

  it("rejects when chat_id doesn't map to a known driver", async () => {
    const sb = makeSupabase({
      driverIdForChat: null,
      order: { id: ORDER_UUID, status: "assigned", driver_id: DRIVER_UUID, order_number: "DEL-100" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-unknown",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("unknown_driver");
  });

  it("rejects when the driver isn't assigned to this order", async () => {
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "assigned", driver_id: OTHER_DRIVER_UUID, order_number: "DEL-100" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-not-mine",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("not_assigned_driver");
  });

  it("rejects an illegal status transition", async () => {
    // pickup expects assigned → picked_up. From picked_up, "pickup" is illegal.
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "picked_up", driver_id: DRIVER_UUID, order_number: "DEL-101" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-illegal",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("rejected");
    expect(out.reason).toBe("illegal_transition");
  });

  it("processes a legal pickup transition (assigned → picked_up)", async () => {
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "assigned", driver_id: DRIVER_UUID, order_number: "DEL-200" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-good-pickup",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
    expect(out.newStatus).toBe("picked_up");

    const orderUpdate = sb.updated.find((r) => r.table === "orders");
    expect(orderUpdate).toBeDefined();
    expect(orderUpdate!.values.status).toBe("picked_up");
    // The optimistic-locking conditions must include status precondition.
    expect(orderUpdate!.conditions).toContainEqual(["status", "assigned"]);
    expect(orderUpdate!.conditions).toContainEqual(["driver_id", DRIVER_UUID]);
    // History row written.
    expect(sb.inserted.some((r) => r.table === "order_status_history")).toBe(true);
  });

  it("stamps delivered_at on the deliver transition", async () => {
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "in_transit", driver_id: DRIVER_UUID, order_number: "DEL-300" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-deliver",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "deliver"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
    expect(out.newStatus).toBe("delivered");
    const orderUpdate = sb.updated.find((r) => r.table === "orders");
    expect(orderUpdate!.values.delivered_at).toBeTruthy();
  });

  it("treats 'issue' as processed without flipping status", async () => {
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "in_transit", driver_id: DRIVER_UUID, order_number: "DEL-400" },
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-issue",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "issue"),
      },
      sb.client,
    );
    expect(out.status).toBe("processed");
    expect(out.reason).toBe("issue_reported");
    expect(sb.updated.some((r) => r.table === "orders")).toBe(false);
  });

  it("returns 'error' if the orders update query fails", async () => {
    const sb = makeSupabase({
      driverIdForChat: DRIVER_UUID,
      order: { id: ORDER_UUID, status: "assigned", driver_id: DRIVER_UUID, order_number: "DEL-500" },
      failOrderUpdate: true,
    });
    const out = await handleDriverCallback(
      {
        callbackId: "cb-explode",
        chatId: DRIVER_CHAT,
        data: encodeCallback(ORDER_UUID, "pickup"),
      },
      sb.client,
    );
    expect(out.status).toBe("error");
  });
});
