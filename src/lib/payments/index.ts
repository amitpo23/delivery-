import { SumitProvider } from "./sumit";
import { GrowProvider } from "./grow";
import { PaymentError, type PaymentProvider } from "./types";

export * from "./types";
export { SumitProvider, GrowProvider };

export type ProviderName = "sumit" | "grow";

/**
 * Returns the configured payment provider.
 * Defaults to Sumit; flip with PAYMENT_PROVIDER=grow.
 */
export function getPaymentProvider(): PaymentProvider {
  const choice = (process.env.PAYMENT_PROVIDER ?? "sumit") as ProviderName;
  if (choice === "grow") return new GrowProvider();
  return new SumitProvider();
}

/**
 * Charges through the primary provider; falls back to the secondary on
 * transient/network errors. Validation errors (PaymentError with retryable=false)
 * are surfaced to the caller — the fallback would just hit the same problem,
 * and the original error is more actionable.
 */
export async function chargeWithFallback(
  primary: PaymentProvider,
  fallback: PaymentProvider,
  req: import("./types").ChargeRequest
): Promise<import("./types").ChargeResult> {
  try {
    return await primary.createCharge(req);
  } catch (err) {
    if (err instanceof PaymentError && err.retryable === false) throw err;
    return await fallback.createCharge(req);
  }
}
