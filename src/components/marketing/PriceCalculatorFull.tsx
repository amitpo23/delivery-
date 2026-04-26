"use client";

import { useState } from "react";
import { MapPin, Package, Truck, Calculator, ArrowLeft } from "lucide-react";
import { SERVICE_TYPES, PACKAGE_TYPES, WEIGHT_RANGES } from "@/constants/services";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface PriceBreakdown {
  basePrice: number;
  weightSurcharge: number;
  typeSurcharge: number;
  distanceSurcharge: number;
  subtotal: number;
  vat: number;
  total: number;
}

export default function PriceCalculatorFull() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serviceType, setServiceType] = useState("next_day");
  const [packageType, setPackageType] = useState("small_package");
  const [weight, setWeight] = useState("light");
  const [result, setResult] = useState<PriceBreakdown | null>(null);

  function calculatePrice() {
    if (!from || !to) return;

    const service = SERVICE_TYPES.find((s) => s.id === serviceType)!;
    const pkg = PACKAGE_TYPES.find((p) => p.id === packageType)!;
    const weightRange = WEIGHT_RANGES.find((w) => w.id === weight)!;

    const basePrice = service.basePrice;
    const weightSurcharge = weightRange.surcharge;
    const typeSurcharge = pkg.surcharge;
    const estimatedDistance = 10 + Math.random() * 50;
    const distanceSurcharge = Math.round(estimatedDistance * 1.0);
    const subtotal = basePrice + weightSurcharge + typeSurcharge + distanceSurcharge;
    const vat = Math.round(subtotal * 0.17);
    const total = subtotal + vat;

    setResult({ basePrice, weightSurcharge, typeSurcharge, distanceSurcharge, subtotal, vat, total });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card !p-8">
        <div className="space-y-6">
          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline ml-1 text-secondary" />
                כתובת איסוף
              </label>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="הזינו עיר או ישוב"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline ml-1 text-primary" />
                כתובת יעד
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="הזינו עיר או ישוב"
                className="input-field"
              />
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Truck className="w-4 h-4 inline ml-1 text-secondary" />
              סוג שירות
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SERVICE_TYPES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setServiceType(s.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      serviceType === s.id
                        ? "border-secondary bg-secondary/5"
                        : "border-border hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: s.color }} />
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.timeframe}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Package & Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="w-4 h-4 inline ml-1 text-secondary" />
                סוג חבילה
              </label>
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                className="input-field"
              >
                {PACKAGE_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name} {p.surcharge > 0 ? `(+${p.surcharge}₪)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                משקל משוער
              </label>
              <select
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input-field"
              >
                {WEIGHT_RANGES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.surcharge > 0 ? `(+${w.surcharge}₪)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculate Button */}
          <button onClick={calculatePrice} className="btn-primary w-full text-lg !py-4">
            <Calculator className="w-5 h-5" />
            חשב מחיר
          </button>

          {/* Results */}
          {result && (
            <div className="bg-gray-50 rounded-xl p-6 space-y-3">
              <h3 className="font-bold text-primary text-lg mb-4">פירוט מחיר</h3>

              <div className="flex justify-between text-sm">
                <span className="text-muted">מחיר בסיס ({SERVICE_TYPES.find(s => s.id === serviceType)?.name})</span>
                <span>{formatPrice(result.basePrice)}</span>
              </div>
              {result.distanceSurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">תוספת מרחק</span>
                  <span>{formatPrice(result.distanceSurcharge)}</span>
                </div>
              )}
              {result.weightSurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">תוספת משקל</span>
                  <span>{formatPrice(result.weightSurcharge)}</span>
                </div>
              )}
              {result.typeSurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">תוספת סוג חבילה</span>
                  <span>{formatPrice(result.typeSurcharge)}</span>
                </div>
              )}

              <div className="border-t border-border pt-3 flex justify-between text-sm">
                <span className="text-muted">סה&quot;כ לפני מע&quot;מ</span>
                <span>{formatPrice(result.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">מע&quot;מ (17%)</span>
                <span>{formatPrice(result.vat)}</span>
              </div>

              <div className="border-t-2 border-primary pt-3 flex justify-between items-center">
                <span className="font-bold text-primary text-lg">סה&quot;כ לתשלום</span>
                <span className="text-3xl font-bold text-primary">{formatPrice(result.total)}</span>
              </div>

              <Link href="/booking" className="btn-primary w-full text-center mt-4">
                להזמנת משלוח
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <p className="text-xs text-muted text-center mt-2">
                * המחיר הוא הערכה בלבד. המחיר הסופי ייקבע לפי המרחק המדויק.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
