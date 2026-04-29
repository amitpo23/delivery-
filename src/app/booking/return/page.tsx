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

    // Sumit's IPN is the source of truth. /api/track exposes
    // payment_status — we poll until it flips to "paid" (typical
    // capture latency: a few seconds). On "cancelled" we surface the
    // failure immediately. After 60s with no terminal state we time
    // out to "verifying" and let the user retry from /booking.
    const t0 = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/track/${encodeURIComponent(orderNumber)}`);
        if (res.ok) {
          const json = await res.json();
          const ps = json.order?.payment_status;
          if (ps === "paid") {
            setState("ok");
            return;
          }
          if (ps === "cancelled" || ps === "refunded") {
            setError("התשלום נדחה או בוטל");
            setState("failed");
            return;
          }
        }
        if (Date.now() - t0 > 60_000) {
          setError("האישור מהסליקה מתעכב — בדוק את העדכונים בסטטוס המשלוח בעוד דקה");
          setState("failed");
          return;
        }
        setTimeout(tick, 1500);
      } catch {
        if (Date.now() - t0 > 60_000) {
          setError("שגיאת רשת באישור התשלום");
          setState("failed");
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
