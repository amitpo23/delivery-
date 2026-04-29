import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  RefundResult,
} from "./types";
import { PaymentError } from "./types";
import { getCreds, sumitPost, SumitApiError } from "./sumit-client";

/**
 * Sumit primary provider.
 *
 * Stub mode: when SUMIT_COMPANY_ID + SUMIT_API_KEY aren't set we return
 * a fake transaction so dev/CI don't try to hit the live API.
 *
 * Live mode: hits the public v1 endpoints
 *   - /billing/payments/charge/    → captures + creates a tax document
 *   - /accounting/documents/cancel/ → cancellation creates the credit
 *     note ("חשבונית זיכוי") that constitutes the refund in Sumit's
 *     accounting model
 *   - /billing/payments/get/        → status verification
 *
 * PCI WARNING: this provider accepts raw card fields (number/exp/cvv)
 * because the existing /booking page collects them in the form.
 * For production deploys you must EITHER:
 *   - Run the call from a PCI-DSS-scoped server, or
 *   - Switch /booking to Sumit's hosted iframe ("OG Pay") which yields
 *     a SingleUseToken that we forward as `card.token` instead.
 * The iframe migration is a separate PR.
 */
export class SumitProvider implements PaymentProvider {
  readonly name = "sumit" as const;

  /** Constructor args override env so tests can isolate the stub branch. */
  constructor(
    private readonly apiKeyOverride?: string,
    private readonly orgIdOverride?: string,
  ) {}

  private creds() {
    if (this.apiKeyOverride && this.orgIdOverride) {
      const numeric = Number(this.orgIdOverride);
      if (!Number.isFinite(numeric)) return null;
      return { CompanyID: numeric, APIKey: this.apiKeyOverride };
    }
    return getCreds();
  }

  private get isStub(): boolean {
    return this.creds() === null;
  }

  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.amount <= 0) {
      throw new PaymentError("Amount must be positive", this.name, undefined, false);
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
        cardLast4: req.card?.last4,
        authorizedAt: now,
        capturedAt: now,
        raw: { stub: true, orderId: req.orderId },
      };
    }

    const creds = this.creds()!;

    // PaymentMethod: Type=1 means CreditCard. Prefer SingleUseToken (PCI-safe)
    // when the booking page collected one via Sumit's hosted page; fall
    // back to raw fields otherwise.
    const usingToken = Boolean(req.card?.token);
    const paymentMethod: Record<string, unknown> = { Type: 1 };
    if (!usingToken) {
      paymentMethod.CreditCard_Number = req.card?.number ?? null;
      paymentMethod.CreditCard_ExpirationMonth = req.card?.expMonth ?? null;
      paymentMethod.CreditCard_ExpirationYear = req.card?.expYear ?? null;
      paymentMethod.CreditCard_CVV = req.card?.cvv ?? null;
      paymentMethod.CreditCard_CitizenID = req.card?.citizenId ?? null;
    }

    const body = {
      Customer: {
        Name: req.customer.name,
        Phone: req.customer.phone ?? null,
        EmailAddress: req.customer.email ?? null,
        ExternalIdentifier: req.orderId,
      },
      PaymentMethod: usingToken ? null : paymentMethod,
      SingleUseToken: usingToken ? req.card?.token : null,
      Items: [
        {
          Item: {
            Name: `הזמנה ${req.orderId}`,
            SKU: req.orderId,
            ExternalIdentifier: req.orderId,
          },
          Quantity: 1,
          UnitPrice: req.amount,
        },
      ],
      VATIncluded: true,
      // Sumit creates the tax invoice + emails the customer in one shot
      // when these are true. We reach the same endpoint we'd otherwise
      // call separately at /accounting/documents/create/.
      SendDocumentByEmail: Boolean(req.customer.email),
      DocumentDescription: `אליהב משלוחים — ${req.orderId}`,
      DocumentLanguage: "he",
      AutoCapture: true,
      DocumentType: 1,
      Credentials: creds,
    };

    type ChargeResponse = {
      Status?: number;
      UserErrorMessage?: string;
      TechnicalErrorDetails?: string;
      Data?: {
        TransactionID?: number;
        AuthNumber?: string;
        DocumentID?: number;
        DocumentNumber?: number;
        CreditCard_Last4?: string;
        Customer?: { ID?: number };
      };
    };

    let response: ChargeResponse;
    try {
      response = await sumitPost<typeof body, ChargeResponse>(
        "/billing/payments/charge/",
        body,
      );
    } catch (err) {
      if (err instanceof SumitApiError) {
        const isValidation = err.statusCode >= 400 && err.statusCode < 500;
        throw new PaymentError(
          `Sumit charge failed: ${err.message}`,
          this.name,
          err,
          !isValidation,
        );
      }
      throw new PaymentError("Sumit network error", this.name, err);
    }

    // Sumit's "Status" is 0 on success. Anything else is a business-level
    // failure that the gateway accepted but couldn't complete (declined,
    // limit exceeded, etc).
    if (response.Status !== 0 && response.Status !== undefined) {
      throw new PaymentError(
        response.UserErrorMessage ?? `Sumit declined (status ${response.Status})`,
        this.name,
        response,
        false,
      );
    }

    const data = response.Data ?? {};
    const txn = data.TransactionID;
    if (!txn) {
      throw new PaymentError("Sumit returned no TransactionID", this.name, response);
    }

    const now = new Date().toISOString();
    return {
      transactionId: String(txn),
      provider: this.name,
      status: "captured",
      amount: req.amount,
      currency: req.currency ?? "ILS",
      cardLast4: data.CreditCard_Last4 ?? req.card?.last4,
      authorizedAt: now,
      capturedAt: now,
      raw: {
        documentId: data.DocumentID,
        documentNumber: data.DocumentNumber,
        authNumber: data.AuthNumber,
        customerId: data.Customer?.ID,
      },
    };
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

    const creds = this.creds()!;
    type GetResponse = {
      Status?: number;
      Data?: {
        ID?: number;
        Amount?: number;
        Currency?: string;
        IsCanceled?: boolean;
      };
    };

    const response = await sumitPost<unknown, GetResponse>(
      "/billing/payments/get/",
      { ID: Number(transactionId), Credentials: creds },
    );

    const d = response.Data ?? {};
    return {
      transactionId,
      provider: this.name,
      status: d.IsCanceled ? "refunded" : "captured",
      amount: Number(d.Amount ?? 0),
      currency: (d.Currency as "ILS") ?? "ILS",
      raw: response,
    };
  }

  async refundCharge(transactionId: string, amount?: number): Promise<RefundResult> {
    if (amount === undefined) {
      throw new PaymentError(
        "amount is required for Sumit refund — Sumit doesn't auto-resolve the original total",
        this.name,
        undefined,
        false,
      );
    }
    if (this.isStub) {
      return {
        refundId: `sumit_stub_refund_${Date.now()}`,
        transactionId,
        amount,
        status: "succeeded",
      };
    }

    const creds = this.creds()!;

    // Sumit's refund model: cancel the original tax document, which
    // automatically generates a credit note ("חשבונית זיכוי"). The
    // PaymentProvider interface only gives us a transactionId, so we
    // look up the linked document via payments/get first.
    type GetResponse = { Data?: { Document?: { ID?: number } } };
    const lookup = await sumitPost<unknown, GetResponse>(
      "/billing/payments/get/",
      { ID: Number(transactionId), Credentials: creds },
    );
    const docId = lookup.Data?.Document?.ID;
    if (!docId) {
      throw new PaymentError(
        "Sumit payment lookup returned no document id — can't issue credit note",
        this.name,
        lookup,
      );
    }

    type CancelResponse = {
      Status?: number;
      UserErrorMessage?: string;
      Data?: { CancellationDocumentID?: number };
    };
    const cancel = await sumitPost<unknown, CancelResponse>(
      "/accounting/documents/cancel/",
      { DocumentID: docId, Credentials: creds },
    );

    if (cancel.Status !== 0 && cancel.Status !== undefined) {
      return {
        refundId: "",
        transactionId,
        amount,
        status: "failed",
        reason: cancel.UserErrorMessage ?? `Sumit cancel status ${cancel.Status}`,
      };
    }

    return {
      refundId: String(cancel.Data?.CancellationDocumentID ?? `cancel_${docId}`),
      transactionId,
      amount,
      status: "succeeded",
    };
  }
}
