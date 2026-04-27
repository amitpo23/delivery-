import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types";
import { PaymentError } from "./types";

/**
 * Grow fallback provider. Same stub-when-no-creds pattern as Sumit.
 */
export class GrowProvider implements PaymentProvider {
  readonly name = "grow" as const;

  constructor(private readonly apiKey: string | undefined = process.env.GROW_API_KEY) {}

  private get isStub(): boolean {
    return !this.apiKey;
  }

  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.amount <= 0) {
      throw new PaymentError("Amount must be positive", this.name, undefined, false);
    }
    if (this.isStub) {
      const now = new Date().toISOString();
      return {
        transactionId: `grow_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        provider: this.name,
        status: "captured",
        amount: req.amount,
        currency: req.currency ?? "ILS",
        authorizedAt: now,
        capturedAt: now,
        raw: { stub: true, orderId: req.orderId },
      };
    }
    throw new PaymentError("Grow live mode not implemented yet", this.name);
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
    throw new PaymentError("Grow live mode not implemented yet", this.name);
  }

  async refundCharge(transactionId: string, amount?: number): Promise<RefundResult> {
    if (amount === undefined) {
      throw new PaymentError(
        "amount is required in stub mode (no original-charge lookup)",
        this.name,
        undefined,
        false
      );
    }
    if (this.isStub) {
      return {
        refundId: `grow_stub_refund_${Date.now()}`,
        transactionId,
        amount,
        status: "succeeded",
      };
    }
    throw new PaymentError("Grow live mode not implemented yet", this.name);
  }
}
