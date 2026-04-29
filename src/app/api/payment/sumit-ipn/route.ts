import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreds, sumitPost } from "@/lib/payments/sumit-client";
import { getEmailSender } from "@/lib/email/resend";
import { orderConfirmationEmail } from "@/lib/email/templates";

/**
 * Sumit IPN (instant payment notification). Sumit POSTs here when a
 * hosted-redirect payment finishes, regardless of whether the user
 * actually got back to /booking/return — so this is the source of truth
 * for capture, not the browser.
 *
 * Sumit's IPN format isn't fully documented in v1 swagger; we accept a
 * permissive shape and pull what we need (ExternalIdentifier =
 * orderNumber, TransactionID, DocumentID, status). When the payload is
 * malformed we re-verify by calling /billing/payments/get/ ourselves.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ipn = payload as {
    ExternalIdentifier?: string;
    TransactionID?: number;
    Document?: { ID?: number; Number?: number };
    DocumentID?: number;
    Status?: number;
    Amount?: number;
    Customer?: { ID?: number };
    CreditCard_Last4?: string;
  };

  const orderNumber = ipn.ExternalIdentifier;
  if (!orderNumber) {
    return NextResponse.json({ error: "Missing ExternalIdentifier" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status, booker_email, booker_full_name, pickup_address, delivery_address, final_price, booker_phone")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // If we've already captured this one, just ack — Sumit retries IPNs.
  if (order.payment_status === "paid") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // If creds present, do an authoritative verification on our side
  // rather than trusting the IPN body alone (defense-in-depth: the IPN
  // URL is public and could be hit by anyone with the order number).
  let txn = ipn.TransactionID;
  let documentId = ipn.Document?.ID ?? ipn.DocumentID;
  let last4 = ipn.CreditCard_Last4;
  let status = ipn.Status;

  const creds = getCreds();
  if (creds && txn) {
    type GetResponse = {
      Status?: number;
      Data?: {
        ID?: number;
        Amount?: number;
        IsCanceled?: boolean;
        Document?: { ID?: number };
        CreditCard_Last4?: string;
      };
    };
    try {
      const verified = await sumitPost<unknown, GetResponse>(
        "/billing/payments/get/",
        { ID: txn, Credentials: creds },
      );
      if (verified.Data) {
        documentId = verified.Data.Document?.ID ?? documentId;
        last4 = verified.Data.CreditCard_Last4 ?? last4;
        status = verified.Status ?? status;
      }
    } catch {
      // Verification failed — fall back to IPN body, but flag in logs.
      console.warn("[sumit-ipn] verify call failed; trusting IPN body");
    }
  }

  if (status !== 0 || !txn) {
    await admin
      .from("orders")
      .update({ payment_status: "cancelled", status: "cancelled" })
      .eq("id", order.id);
    await admin
      .from("coupon_redemptions")
      .update({ status: "cancelled" })
      .eq("order_id", order.id)
      .eq("status", "pending");
    return NextResponse.json({ ok: true, accepted: false });
  }

  await admin
    .from("orders")
    .update({
      payment_status: "paid",
      payment_transaction_id: String(txn),
      card_last4: last4 ?? null,
    })
    .eq("id", order.id);

  // Flip any pending coupon_redemptions row to 'redeemed'. The row was
  // inserted at /api/payment/begin so admin/coupons could see it as
  // in-flight. Idempotent: re-running matches zero rows on retry.
  await admin
    .from("coupon_redemptions")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("order_id", order.id)
    .eq("status", "pending");

  // Best-effort confirmation email — Sumit already emails the tax
  // invoice directly when SendDocumentByEmail was true (see PR #36),
  // so this is a friendlier branded receipt on top.
  if (order.booker_email) {
    try {
      const sender = getEmailSender();
      await sender.send(
        orderConfirmationEmail({
          to: order.booker_email,
          orderNumber,
          total: Number(order.final_price ?? 0),
          pickupAddress: order.pickup_address,
          deliveryAddress: order.delivery_address,
          bookerName: order.booker_full_name ?? "",
        }),
      );
    } catch (err) {
      console.error("[sumit-ipn] confirmation email failed", err);
    }
  }

  return NextResponse.json({ ok: true, captured: true, transactionId: txn, documentId });
}

/** Sumit also retries with GET in some failure modes — accept it. */
export async function GET(req: Request) {
  return POST(req);
}
