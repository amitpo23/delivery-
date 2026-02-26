"use client";

import { useState } from "react";
import { MapPin, ArrowLeft, Package } from "lucide-react";
import { SERVICE_TYPES, WEIGHT_RANGES } from "@/constants/services";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function PriceCalculatorMini() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serviceType, setServiceType] = useState("next_day");
  const [weight, setWeight] = useState("light");
  const [result, setResult] = useState<number | null>(null);

  function calculatePrice() {
    const service = SERVICE_TYPES.find((s) => s.id === serviceType);
    const weightRange = WEIGHT_RANGES.find((w) => w.id === weight);
    if (!service || !weightRange || !from || !to) return;

    const base = service.basePrice;
    const weightSurcharge = weightRange.surcharge;
    const estimatedDistance = 15 + Math.random() * 40; // placeholder
    const distanceSurcharge = Math.round(estimatedDistance * 1.2);
    const subtotal = base + weightSurcharge + distanceSurcharge;
    const total = Math.round(subtotal * 1.17); // VAT

    setResult(total);
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-border">
      <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-secondary" />
        חשבו מחיר משלוח
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        {/* From */}
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

        {/* To */}
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

        {/* Service Type */}
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

        {/* Weight */}
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

        {/* Calculate */}
        <div>
          <button onClick={calculatePrice} className="btn-primary w-full">
            חשב מחיר
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm text-green-700">מחיר משוער (כולל מע&quot;מ)</div>
            <div className="text-3xl font-bold text-green-800">{formatPrice(result)}</div>
          </div>
          <Link href="/order" className="btn-primary !bg-green-600 hover:!bg-green-700">
            להזמנה
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
