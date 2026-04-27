import { describe, it, expect, beforeEach, vi } from "vitest";
import { dispatchOrderEvent, type OrderRow } from "../dispatcher";
import { _resetSendersForTest } from "../index";

interface FakeRow {
  table: string;
  values: Record<string, unknown>;
}

function makeFakeSupabase({
  adminChats = [] as string[],
  driverChat = null as string | null,
  duplicateEventIds = new Set<string>(),
  insertFails = false,
}: {
  adminChats?: string[];
  driverChat?: string | null;
  duplicateEventIds?: Set<string>;
  insertFails?: boolean;
} = {}) {
  const inserted: FakeRow[] = [];
  const updated: Array<{ id: string; patch: Record<string, unknown> }> = [];
  let nextId = 1;

  const builder = (table: string) => {
    const ctx: { conditions: Array<[string, unknown]> } = { conditions: [] };

    function selectChain(_cols: string) {
      const chain = {
        eq: (k: string, v: unknown) => {
          ctx.conditions.push([k, v]);
          return chain;
        },
        not: () => chain,
        maybeSingle: async () => {
          if (table === "drivers") {
            return { data: { telegram_chat_id: driverChat, user_id: "user_for_driver" }, error: null };
          }
          if (table === "profiles") {
            return { data: { telegram_chat_id: driverChat }, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => ({ data: null, error: null }),
        then: undefined,
      } as unknown as { [k: string]: unknown };
      // direct await - return the listing
      const direct = Promise.resolve(
        table === "profiles"
          ? { data: adminChats.map((c) => ({ telegram_chat_id: c })), error: null }
          : { data: [], error: null }
      );
      // emulate "await supabase.from('profiles').select(...).eq(...).not(...)"
      Object.defineProperty(chain, "then", {
        value: direct.then.bind(direct),
        enumerable: false,
      });
      return chain;
    }

    function insert(values: Record<string, unknown>) {
      return {
        select: () => ({
          single: async () => {
            if (insertFails) {
              return { data: null, error: { code: "OTHER", message: "boom" } };
            }
            const eventId = String(values.event_id);
            if (duplicateEventIds.has(eventId)) {
              return { data: null, error: { code: "23505", message: "dup" } };
            }
            duplicateEventIds.add(eventId);
            const row = { id: `n${nextId++}` };
            inserted.push({ table, values });
            return { data: row, error: null };
          },
        }),
      };
    }

    function update(patch: Record<string, unknown>) {
      return {
        eq: (_k: string, v: string) => {
          updated.push({ id: v, patch });
          return Promise.resolve({ data: null, error: null });
        },
      };
    }

    return {
      select: selectChain,
      insert,
      update,
    };
  };

  // typed loosely on purpose
  const supabase = { from: (t: string) => builder(t) } as unknown as Parameters<typeof dispatchOrderEvent>[1];
  return { supabase, inserted, updated };
}

const baseOrder = (overrides: Partial<OrderRow> = {}): OrderRow => ({
  id: "11111111-1111-1111-1111-111111111111",
  order_number: "DEL-TEST-0001",
  status: "pending",
  driver_id: null,
  pickup_address: "חיפה, הרצל 5",
  delivery_address: "בית שאן, שאול המלך 22",
  booker_phone: "0501234567",
  cancellation_reason: null,
  ...overrides,
});

describe("dispatcher", () => {
  beforeEach(() => {
    _resetSendersForTest();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.GREEN_API_INSTANCE_ID;
    delete process.env.GREEN_API_TOKEN;
    vi.restoreAllMocks();
  });

  it("INSERT pending notifies customer (whatsapp) + admins (telegram)", async () => {
    const { supabase, inserted } = makeFakeSupabase({ adminChats: ["100", "200"] });
    const out = await dispatchOrderEvent(
      { type: "INSERT", newRow: baseOrder(), oldRow: null },
      supabase
    );
    expect(out.planned).toBe(3);
    expect(out.sent).toBe(3);
    expect(out.failed).toBe(0);
    const channels = inserted.map((i) => i.values.provider).sort();
    expect(channels).toEqual(["telegram", "telegram", "whatsapp"]);
  });

  it("UPDATE same status -> no sends", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100"] });
    const order = baseOrder({ status: "assigned", driver_id: "22222222-2222-2222-2222-222222222222" });
    const out = await dispatchOrderEvent(
      { type: "UPDATE", newRow: order, oldRow: order },
      supabase
    );
    expect(out.planned).toBe(0);
  });

  it("UPDATE status change -> only customer + driver for assigned", async () => {
    const { supabase, inserted } = makeFakeSupabase({
      adminChats: ["100"],
      driverChat: "555",
    });
    const out = await dispatchOrderEvent(
      {
        type: "UPDATE",
        newRow: baseOrder({ status: "assigned", driver_id: "22222222-2222-2222-2222-222222222222" }),
        oldRow: baseOrder({ status: "pending" }),
      },
      supabase
    );
    expect(out.planned).toBe(2);
    expect(out.sent).toBe(2);
    const recipients = inserted.map((i) => i.values.recipient).sort();
    expect(recipients).toEqual(["0501234567", "555"]);
  });

  it("idempotency: duplicate webhook fires only sends once", async () => {
    const dup = new Set<string>();
    const { supabase: s1 } = makeFakeSupabase({ adminChats: ["100"], duplicateEventIds: dup });
    await dispatchOrderEvent({ type: "INSERT", newRow: baseOrder(), oldRow: null }, s1);

    const { supabase: s2 } = makeFakeSupabase({ adminChats: ["100"], duplicateEventIds: dup });
    const second = await dispatchOrderEvent(
      { type: "INSERT", newRow: baseOrder(), oldRow: null },
      s2
    );
    expect(second.planned).toBe(2);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(2);
  });

  it("delivered -> only customer", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100"] });
    const out = await dispatchOrderEvent(
      {
        type: "UPDATE",
        newRow: baseOrder({ status: "delivered" }),
        oldRow: baseOrder({ status: "in_transit" }),
      },
      supabase
    );
    expect(out.planned).toBe(1);
    expect(out.details[0].channel).toBe("whatsapp");
  });

  it("in_transit -> notifies customer (was silently dropped before)", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100"] });
    const out = await dispatchOrderEvent(
      {
        type: "UPDATE",
        newRow: baseOrder({ status: "in_transit" }),
        oldRow: baseOrder({ status: "picked_up" }),
      },
      supabase
    );
    expect(out.planned).toBe(1);
    expect(out.details[0].channel).toBe("whatsapp");
  });

  it("confirmed -> intentionally quiet", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100"] });
    const out = await dispatchOrderEvent(
      {
        type: "UPDATE",
        newRow: baseOrder({ status: "confirmed" }),
        oldRow: baseOrder({ status: "pending" }),
      },
      supabase
    );
    expect(out.planned).toBe(0);
  });

  it("cancelled -> customer + admins", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100", "200"] });
    const out = await dispatchOrderEvent(
      {
        type: "UPDATE",
        newRow: baseOrder({ status: "cancelled", cancellation_reason: "no answer" }),
        oldRow: baseOrder({ status: "assigned" }),
      },
      supabase
    );
    expect(out.planned).toBe(3);
    expect(out.sent).toBe(3);
  });

  it("no booker_phone -> customer skipped silently", async () => {
    const { supabase } = makeFakeSupabase({ adminChats: ["100"] });
    const out = await dispatchOrderEvent(
      { type: "INSERT", newRow: baseOrder({ booker_phone: null }), oldRow: null },
      supabase
    );
    expect(out.planned).toBe(1);
    expect(out.details[0].channel).toBe("telegram");
  });
});
