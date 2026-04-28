"use client";

import { useState } from "react";
import { MapPin, ArrowLeft, Package } from "lucide-react";
import { SERVICE_TYPES, WEIGHT_RANGES } from "@/constants/services";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const WEIGHT_TO_SIZE: Record<string, "S" | "M" | "L" | "XL"> = {
  light: "S",
  medium: "M",
  heavy: "L",
  very_heavy: "XL",
};

const SUPPORTED_URGENCIES = new Set(["express", "same_day", "next_day", "economy"]);

export default function PriceCalculatorMini() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serviceType, setServiceType] = useState("next_day");
  const [weight, setWeight] = useState("light");
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculatePrice() {
    setError(null);
    setResult(null);

    if (!from.trim() || !to.trim()) {
      setError("נא למלא את כתובת המוצא והיעד");
      return;
    }
    const size = WEIGHT_TO_SIZE[weight];
    if (!size || !SUPPORTED_URGENCIES.has(serviceType)) {
      setError("בחירת שירות / משקל לא תקינה");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pricing/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: from.trim(),
          deliveryAddress: to.trim(),
          size,
          urgency: serviceType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 422 && json.coverage) {
          setError(`כתובת מחוץ לאזור הכיסוי. אזורים: ${json.coverage.join(", ")}`);
        } else {
          setError(json.error || "שגיאה בחישוב המחיר");
        }
        return;
      }
      setResult(json.quote.total);
    } catch {
      setError("שגיאת רשת. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-border">
      <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-secondary" />
        חשבו מחיר משלוח
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מאיפה?</label>
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="עיר/ישוב מוצא"
              className="input-field !pr-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">לאיפה?</label>
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="עיר/ישוב יעד"
              className="input-field !pr-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג שירות</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="input-field"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.timeframe}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">משקל</label>
          <select
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input-field"
          >
            {WEIGHT_RANGES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={calculatePrice}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "מחשב..." : "חשב מחיר"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {result !== null && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm text-green-700">מחיר משוער (כולל מע&quot;מ)</div>
            <div className="text-3xl font-bold text-green-800">{formatPrice(result)}</div>
          </div>
          <Link
            href={`/booking?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&service=${serviceType}&weight=${weight}`}
            className="btn-primary !bg-green-600 hover:!bg-green-700"
          >
            להזמנה
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
