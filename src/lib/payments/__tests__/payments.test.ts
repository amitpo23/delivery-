import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SumitProvider,
  GrowProvider,
  chargeWithFallback,
  getPaymentProvider,
  PaymentError,
} from "../index";
import type { ChargeRequest, PaymentProvider } from "../types";

const baseReq: ChargeRequest = {
  amount: 89,
  orderId: "order_test",
  customer: { name: "Test", phone: "0500000000" },
};

describe("SumitProvider (stub mode)", () => {
  it("createCharge returns captured result", async () => {
    const sumit = new SumitProvider(undefined, undefined);
    const r = await sumit.createCharge(baseReq);
    expect(r.provider).toBe("sumit");
    expect(r.status).toBe("captured");
    expect(r.amount).toBe(89);
    expect(r.currency).toBe("ILS");
    expect(r.transactionId).toMatch(/^sumit_stub_/);
  });

  it("rejects non-positive amount", async () => {
    const sumit = new SumitProvider(undefined, undefined);
    await expect(sumit.createCharge({ ...baseReq, amount: 0 })).rejects.toBeInstanceOf(PaymentError);
  });

  it("verifyCharge echoes id and reports captured", async () => {
    const sumit = new SumitProvider(undefined, undefined);
    const r = await sumit.verifyCharge("abc");
    expect(r.transactionId).toBe("abc");
    expect(r.status).toBe("captured");
  });

  it("refundCharge returns succeeded with explicit amount", async () => {
    const sumit = new SumitProvider(undefined, undefined);
    const r = await sumit.refundCharge("abc", 50);
    expect(r.status).toBe("succeeded");
    expect(r.amount).toBe(50);
  });

  it("refundCharge requires amount in stub mode (no silent zero)", async () => {
    const sumit = new SumitProvider(undefined, undefined);
    await expect(sumit.refundCharge("abc")).rejects.toBeInstanceOf(PaymentError);
  });

  it("live mode (creds present) throws not-implemented", async () => {
    const sumit = new SumitProvider("real-key", "org-1");
    await expect(sumit.createCharge(baseReq)).rejects.toBeInstanceOf(PaymentError);
  });
});

describe("GrowProvider (stub mode)", () => {
  it("createCharge returns captured", async () => {
    const grow = new GrowProvider(undefined);
    const r = await grow.createCharge(baseReq);
    expect(r.provider).toBe("grow");
    expect(r.transactionId).toMatch(/^grow_stub_/);
  });
});

describe("chargeWithFallback", () => {
  it("uses primary when it succeeds", async () => {
    const primary: PaymentProvider = {
      name: "sumit",
      createCharge: async () => ({
        transactionId: "primary_ok",
        provider: "sumit",
        status: "captured",
        amount: 89,
        currency: "ILS",
      }),
      verifyCharge: async () => ({ transactionId: "x", provider: "sumit", status: "captured", amount: 0, currency: "ILS" }),
      refundCharge: async () => ({ refundId: "r", transactionId: "x", amount: 0, status: "succeeded" }),
    };
    const fallback: PaymentProvider = {
      ...primary,
      name: "grow",
      createCharge: async () => {
        throw new Error("should not be called");
      },
    };
    const r = await chargeWithFallback(primary, fallback, baseReq);
    expect(r.transactionId).toBe("primary_ok");
  });

  it("does NOT fall back on validation errors (retryable=false)", async () => {
    const primary: PaymentProvider = {
      name: "sumit",
      createCharge: async () => {
        throw new PaymentError("Amount must be positive", "sumit", undefined, false);
      },
      verifyCharge: async () => ({ transactionId: "x", provider: "sumit", status: "captured", amount: 0, currency: "ILS" }),
      refundCharge: async () => ({ refundId: "r", transactionId: "x", amount: 0, status: "succeeded" }),
    };
    let fallbackCalled = false;
    const fallback: PaymentProvider = {
      name: "grow",
      createCharge: async () => {
        fallbackCalled = true;
        return { transactionId: "fb", provider: "grow", status: "captured", amount: 89, currency: "ILS" };
      },
      verifyCharge: async () => ({ transactionId: "x", provider: "grow", status: "captured", amount: 0, currency: "ILS" }),
      refundCharge: async () => ({ refundId: "r", transactionId: "x", amount: 0, status: "succeeded" }),
    };
    await expect(chargeWithFallback(primary, fallback, baseReq)).rejects.toBeInstanceOf(PaymentError);
    expect(fallbackCalled).toBe(false);
  });

  it("falls back when primary throws", async () => {
    const primary: PaymentProvider = {
      name: "sumit",
      createCharge: async () => {
        throw new PaymentError("down", "sumit");
      },
      verifyCharge: async () => ({ transactionId: "x", provider: "sumit", status: "captured", amount: 0, currency: "ILS" }),
      refundCharge: async () => ({ refundId: "r", transactionId: "x", amount: 0, status: "succeeded" }),
    };
    const fallback: PaymentProvider = {
      name: "grow",
      createCharge: async () => ({
        transactionId: "fallback_ok",
        provider: "grow",
        status: "captured",
        amount: 89,
        currency: "ILS",
      }),
      verifyCharge: async () => ({ transactionId: "x", provider: "grow", status: "captured", amount: 0, currency: "ILS" }),
      refundCharge: async () => ({ refundId: "r", transactionId: "x", amount: 0, status: "succeeded" }),
    };
    const r = await chargeWithFallback(primary, fallback, baseReq);
    expect(r.provider).toBe("grow");
    expect(r.transactionId).toBe("fallback_ok");
  });
});

describe("getPaymentProvider factory", () => {
  const original = process.env.PAYMENT_PROVIDER;
  afterEach(() => {
    process.env.PAYMENT_PROVIDER = original;
  });
  beforeEach(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  it("defaults to Sumit", () => {
    expect(getPaymentProvider().name).toBe("sumit");
  });

  it("returns Grow when env says so", () => {
    process.env.PAYMENT_PROVIDER = "grow";
    expect(getPaymentProvider().name).toBe("grow");
  });
});
