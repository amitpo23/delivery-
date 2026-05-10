import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sumit IPN route — Sumit posts here when a hosted-page payment finishes.
 * The route doesn't HMAC the body; instead it does *defense-in-depth*:
 *   - reject if ExternalIdentifier is missing or doesn't match an order
 *   - if order already paid → idempotent ack (Sumit retries)
 *   - if Sumit creds present, re-verify by calling /billing/payments/get/
 *   - status=0 + a transaction id → mark paid; otherwise mark cancelled
 *
 * These tests stub Supabase admin + sumit-client + email so the unit
 * runs without network or DB. They focus on the security-critical
 * branches: rejection of malformed/replayed/unknown payments and the
 * cancel vs. capture decision.
 */

// ── Mocks (must be hoisted before importing the route) ───────────────

const mockOrder = {
  id: "order-uuid-1",
  payment_status: "pending",
  booker_email: null as string | null,
  booker_full_name: "אליהב",
  pickup_address: "חיפה",
  delivery_address: "עפולה",
  final_price: 99,
  booker_phone: "0500000000",
};

const dbState = {
  ordersByNumber: new Map<string, typeof mockOrder>(),
  // Capture writes for assertions
  updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
};

function resetDb() {
  dbState.ordersByNumber.clear();
  dbState.updates.length = 0;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from(table: string) {
      return {
        select: () => ({
          eq: (_col: string, value: string) => ({
            async maybeSingle() {
              if (table === "orders") {
                const order = dbState.ordersByNumber.get(value);
                return { data: order ?? null, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        update: (values: Record<string, unknown>) => {
          dbState.updates.push({ table, values });
          return {
            eq: () => ({
              eq: async () => ({ data: null, error: null }),
              async then(resolve: (r: { data: null; error: null }) => void) {
                resolve({ data: null, error: null });
              },
            }),
          };
        },
      };
    },
  })),
}));

vi.mock("@/lib/payments/sumit-client", () => ({
  // No creds present → route trusts the IPN body and skips verification.
  // This is the cleanest signal for a unit test.
  getCreds: vi.fn(() => null),
  sumitPost: vi.fn(),
}));

vi.mock("@/lib/email/resend", () => ({
  getEmailSender: vi.fn(() => ({ send: vi.fn(async () => undefined) })),
}));

vi.mock("@/lib/email/templates", () => ({
  orderConfirmationEmail: vi.fn(() => ({ to: "x", subject: "x", html: "x" })),
}));

import { POST } from "../route";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/payment/sumit-ipn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("/api/payment/sumit-ipn", () => {
  beforeEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(makeReq("nope"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/);
  });

  it("rejects payloads without ExternalIdentifier with 400", async () => {
    const res = await POST(
      makeReq({ TransactionID: 12345, Status: 0 })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing ExternalIdentifier/);
  });

  it("returns 404 when ExternalIdentifier doesn't match an order", async () => {
    // No orders in dbState → maybeSingle returns null
    const res = await POST(
      makeReq({
        ExternalIdentifier: "DEL-DOES-NOT-EXIST",
        TransactionID: 12345,
        Status: 0,
      })
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Order not found/);
  });

  it("acks idempotently when the order is already paid (Sumit retries)", async () => {
    dbState.ordersByNumber.set("DEL-PAID", {
      ...mockOrder,
      payment_status: "paid",
    });

    const res = await POST(
      makeReq({
        ExternalIdentifier: "DEL-PAID",
        TransactionID: 12345,
        Status: 0,
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.idempotent).toBe(true);
    // No write should happen on a re-delivered IPN
    expect(dbState.updates).toHaveLength(0);
  });

  it("cancels the order when Sumit reports a non-success status", async () => {
    dbState.ordersByNumber.set("DEL-FAIL", { ...mockOrder });

    const res = await POST(
      makeReq({
        ExternalIdentifier: "DEL-FAIL",
        TransactionID: 12345,
        Status: 7, // any non-zero
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accepted).toBe(false);

    // Order should be marked cancelled, redemption should also be cancelled
    const ordersUpdate = dbState.updates.find((u) => u.table === "orders");
    expect(ordersUpdate?.values.payment_status).toBe("cancelled");
    expect(ordersUpdate?.values.status).toBe("cancelled");
  });

  it("captures the payment on Status=0 + valid TransactionID", async () => {
    dbState.ordersByNumber.set("DEL-OK", { ...mockOrder });

    const res = await POST(
      makeReq({
        ExternalIdentifier: "DEL-OK",
        TransactionID: 99999,
        Status: 0,
        Document: { ID: 4242 },
        CreditCard_Last4: "1234",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.captured).toBe(true);
    expect(json.transactionId).toBe(99999);
    expect(json.documentId).toBe(4242);

    const ordersUpdate = dbState.updates.find((u) => u.table === "orders");
    expect(ordersUpdate?.values.payment_status).toBe("paid");
    expect(ordersUpdate?.values.payment_transaction_id).toBe("99999");
    expect(ordersUpdate?.values.card_last4).toBe("1234");

    // Coupon redemption flipped to redeemed
    const couponUpdate = dbState.updates.find(
      (u) => u.table === "coupon_redemptions"
    );
    expect(couponUpdate?.values.status).toBe("redeemed");
    expect(typeof couponUpdate?.values.redeemed_at).toBe("string");
  });

  it("rejects Status=0 with no TransactionID — treats as failure", async () => {
    // Replay-style attack: Status=0 alone (no txn) shouldn't be enough.
    dbState.ordersByNumber.set("DEL-REPLAY", { ...mockOrder });

    const res = await POST(
      makeReq({
        ExternalIdentifier: "DEL-REPLAY",
        Status: 0,
        // no TransactionID
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accepted).toBe(false);

    const ordersUpdate = dbState.updates.find((u) => u.table === "orders");
    expect(ordersUpdate?.values.payment_status).toBe("cancelled");
  });
});
