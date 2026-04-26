import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types";
import { PaymentError } from "./types";

/**
 * Sumit primary provider.
 *
 * Stub implementation: returns success synchronously without calling Sumit.
 * When SUMIT_API_KEY + SUMIT_ORG_ID are populated, swap the body of each
 * method for the real REST calls (Sumit Documents API + Charge endpoint).
 *
 * Stub mode is signaled by the absence of credentials and is used in dev/CI.
 */
export class SumitProvider implements PaymentProvider {
  readonly name = "sumit" as const;

  constructor(
    private readonly apiKey: string | undefined = process.env.SUMIT_API_KEY,
    private readonly orgId: string | undefined = process.env.SUMIT_ORG_ID
  ) {}

  private get isStub(): boolean {
    return !this.apiKey || !this.orgId;
  }

  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.amount <= 0) {
      throw new PaymentError("Amount must be positive", this.name);
    }
    if (this.isStub) {
      const transactionId = `sumit_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      return {
        transactionId,
        provider: this.name,
        status: "captured",
        amount: req.amount,
        currency: req.currency ?? "ILS",
        authorizedAt: now,
        capturedAt: now,
        raw: { stub: true, orderId: req.orderId },
      };
    }
    throw new PaymentError("Sumit live mode not implemented yet", this.name);
  }

  async verifyCharge(transactionId: string): Promise<ChargeResult> {
    if (this.isStub) {
      return {
        transactionId,
        provider: this.name,
        status: "captured",
        amount: 0,
        currency: "ILS",
        raw: { stub: true },
      };
    }
    throw new PaymentError("Sumit live mode not implemented yet", this.name);
  }

  async refundCharge(transactionId: string, amount?: number): Promise<RefundResult> {
    if (this.isStub) {
      return {
        refundId: `sumit_stub_refund_${Date.now()}`,
        transactionId,
        amount: amount ?? 0,
        status: "succeeded",
      };
    }
    throw new PaymentError("Sumit live mode not implemented yet", this.name);
  }
}
