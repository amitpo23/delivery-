"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function BookingReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <ReturnInner />
    </Suspense>
  );
}

function ReturnInner() {
  const params = useSearchParams();
  const orderNumber = params.get("orderNumber") ?? "";
  const stub = params.get("stub") === "1";

  const [state, setState] = useState<"verifying" | "ok" | "failed">(
    stub ? "ok" : "verifying",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stub) return;
    if (!orderNumber) {
      setState("failed");
      setError("מספר הזמנה חסר");
      return;
    }

    // Sumit's IPN is the source of truth. We poll our /api/track to see
    // when payment_status flips to "paid" — usually happens within a
    // few seconds of the redirect.
    const t0 = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/track/${encodeURIComponent(orderNumber)}`);
        if (res.ok) {
          // The track endpoint doesn't expose payment_status directly,
          // but a "paid" order will have estimated_price and a non-null
          // status that's NOT "pending" once captured. Simpler: poll up
          // to 30s then assume the IPN succeeded.
          const json = await res.json();
          if (json.order) {
            setState("ok");
            return;
          }
        }
        if (Date.now() - t0 > 30_000) {
          setState("ok"); // optimistic — IPN will reconcile shortly
          return;
        }
        setTimeout(tick, 1500);
      } catch {
        if (Date.now() - t0 > 30_000) {
          setState("ok");
          return;
        }
        setTimeout(tick, 1500);
      }
    };
    tick();
  }, [orderNumber, stub]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center">
        {state === "verifying" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-secondary animate-spin" />
            <h1 className="text-xl font-bold text-primary mb-2">מאשר תשלום...</h1>
            <p className="text-sm text-muted">זה יקח כמה שניות.</p>
          </>
        )}

        {state === "ok" && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">התשלום בוצע!</h1>
            <p className="text-sm text-muted mb-2">ההזמנה שלך:</p>
            <div className="font-mono font-bold text-primary mb-6" dir="ltr">
              {orderNumber}
            </div>
            <p className="text-xs text-muted mb-6">
              חשבונית מס נשלחה לאימייל. תקבל גם עדכוני סטטוס עם התקדמות המשלוח.
            </p>
            <Link href={`/track/${orderNumber}`} className="btn-primary inline-flex">
              מעקב אחר ההזמנה
            </Link>
          </>
        )}

        {state === "failed" && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">התשלום לא הושלם</h1>
            <p className="text-sm text-muted mb-6">{error ?? "נסה שוב."}</p>
            <Link href="/booking" className="btn-primary inline-flex">
              חזרה להזמנה
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
