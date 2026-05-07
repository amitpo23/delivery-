import { describe, it, expect } from "vitest";
import {
  isConnectCommand,
  normalizeIsraeliPhone,
  handleBotCommand,
} from "../connect";

const CHAT_ID = "12345";

describe("isConnectCommand", () => {
  it("matches /connect, /whoami, /disconnect", () => {
    expect(isConnectCommand("/connect 0501234567")).toBe(true);
    expect(isConnectCommand("/whoami")).toBe(true);
    expect(isConnectCommand("/disconnect")).toBe(true);
    expect(isConnectCommand("/CONNECT 0501234567")).toBe(true);
  });

  it("ignores conversational text", () => {
    expect(isConnectCommand("שלום")).toBe(false);
    expect(isConnectCommand("1")).toBe(false);
    expect(isConnectCommand("הזמנה חדשה")).toBe(false);
  });
});

describe("normalizeIsraeliPhone", () => {
  it("normalizes common forms to 972...", () => {
    expect(normalizeIsraeliPhone("0501234567")).toBe("972501234567");
    expect(normalizeIsraeliPhone("050-123-4567")).toBe("972501234567");
    expect(normalizeIsraeliPhone("+972 50 123 4567")).toBe("972501234567");
    expect(normalizeIsraeliPhone("972501234567")).toBe("972501234567");
  });

  it("rejects invalid input", () => {
    expect(normalizeIsraeliPhone("")).toBeNull();
    expect(normalizeIsraeliPhone("123")).toBeNull();
    expect(normalizeIsraeliPhone("abcdefg")).toBeNull();
  });
});

interface MockOpts {
  profile?: { id: string; full_name: string; role: string; telegram_chat_id: string | null; phone: string } | null;
}

function makeSupabase(opts: MockOpts = {}) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];

  function from(table: string) {
    return {
      select(_cols: string) {
        const ctx = { conditions: [] as Array<[string, unknown]> };
        const chain = {
          eq(k: string, v: unknown) {
            ctx.conditions.push([k, v]);
            return chain;
          },
          in(_k: string, _v: unknown[]) {
            return chain;
          },
          maybeSingle: async () => {
            if (table === "profiles") return { data: opts.profile ?? null, error: null };
            return { data: null, error: null };
          },
        };
        return chain;
      },
      update(values: Record<string, unknown>) {
        const localCtx = { conditions: [] as Array<[string, unknown]> };
        const eqChain: { eq: (k: string, v: unknown) => typeof eqChain; then: (onF: (v: unknown) => unknown) => Promise<unknown> } = {
          eq(k: string, v: unknown) {
            localCtx.conditions.push([k, v]);
            return eqChain;
          },
          then(onF: (v: unknown) => unknown) {
            updates.push({ table, values });
            return Promise.resolve({ data: null, error: null }).then(onF);
          },
        };
        return eqChain;
      },
    };
  }
  return { client: { from } as unknown as Parameters<typeof handleBotCommand>[2], updates };
}

describe("handleBotCommand /connect", () => {
  it("connects a driver by phone and stamps both tables", async () => {
    const sb = makeSupabase({
      profile: {
        id: "user-1",
        full_name: "ישראל ישראלי",
        role: "driver",
        telegram_chat_id: null,
        phone: "972501234567",
      },
    });
    const out = await handleBotCommand("/connect 0501234567", CHAT_ID, sb.client);
    expect(out?.reply).toContain("חובר בהצלחה");
    expect(out?.reply).toContain("ישראל ישראלי");
    // Both profiles and drivers must be updated.
    const tables = sb.updates.map((u) => u.table);
    expect(tables).toContain("profiles");
    expect(tables).toContain("drivers");
  });

  it("rejects unknown phone", async () => {
    const sb = makeSupabase({ profile: null });
    const out = await handleBotCommand("/connect 0599999999", CHAT_ID, sb.client);
    expect(out?.reply).toContain("לא רשום");
    expect(sb.updates).toHaveLength(0);
  });

  it("rejects when phone is bound to another chat", async () => {
    const sb = makeSupabase({
      profile: {
        id: "user-2",
        full_name: "אחר",
        role: "driver",
        telegram_chat_id: "different-chat",
        phone: "972501234567",
      },
    });
    const out = await handleBotCommand("/connect 0501234567", CHAT_ID, sb.client);
    expect(out?.reply).toContain("כבר מחובר");
    expect(sb.updates).toHaveLength(0);
  });

  it("rejects roles other than driver/admin", async () => {
    const sb = makeSupabase({
      profile: {
        id: "user-3",
        full_name: "לקוח",
        role: "customer",
        telegram_chat_id: null,
        phone: "972501234567",
      },
    });
    const out = await handleBotCommand("/connect 0501234567", CHAT_ID, sb.client);
    expect(out?.reply).toContain("רק לנהגים ולמנהלים");
  });

  it("rejects invalid phone format", async () => {
    const sb = makeSupabase();
    const out = await handleBotCommand("/connect notaphone", CHAT_ID, sb.client);
    expect(out?.reply).toContain("לא תקין");
    expect(sb.updates).toHaveLength(0);
  });

  it("admin connect only stamps profiles, not drivers", async () => {
    const sb = makeSupabase({
      profile: {
        id: "admin-1",
        full_name: "המנהל",
        role: "admin",
        telegram_chat_id: null,
        phone: "972502222222",
      },
    });
    const out = await handleBotCommand("/connect 0502222222", CHAT_ID, sb.client);
    expect(out?.reply).toContain("חובר בהצלחה");
    const tables = sb.updates.map((u) => u.table);
    expect(tables).toContain("profiles");
    expect(tables).not.toContain("drivers");
  });
});

describe("handleBotCommand /whoami", () => {
  it("reports unbound chats", async () => {
    const sb = makeSupabase({ profile: null });
    const out = await handleBotCommand("/whoami", CHAT_ID, sb.client);
    expect(out?.reply).toContain("לא מחובר");
  });
});
