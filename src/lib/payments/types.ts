export type Currency = "ILS";

export interface ChargeRequest {
  amount: number;
  currency?: Currency;
  orderId: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  card?: {
    holderName: string;
    last4?: string;
    token?: string;
  };
  metadata?: Record<string, string>;
  returnUrl?: string;
}

export type ChargeStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";

export interface ChargeResult {
  transactionId: string;
  provider: "sumit" | "grow";
  status: ChargeStatus;
  amount: number;
  currency: Currency;
  authorizedAt?: string;
  capturedAt?: string;
  failureReason?: string;
  redirectUrl?: string;
  raw?: unknown;
}

export interface RefundResult {
  refundId: string;
  transactionId: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  reason?: string;
}

export interface PaymentProvider {
  name: "sumit" | "grow";
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
  verifyCharge(transactionId: string): Promise<ChargeResult>;
  refundCharge(transactionId: string, amount?: number): Promise<RefundResult>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PaymentError";
  }
}
