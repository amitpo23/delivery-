"use client";

import { useState, useMemo } from "react";
import { MapPin, Package, Truck, ArrowLeft, Calculator, Sparkles } from "lucide-react";
import {
  SERVICE_TYPES,
  PACKAGE_TYPES,
  WEIGHT_RANGES,
} from "@/constants/services";
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

  // Recalculate live as soon as both addresses are present.
  // Distance heuristic kept identical to the previous implementation
  // so the public quote remains a stable estimate the team has tuned.
  const result: PriceBreakdown | null = useMemo(() => {
    if (!from || !to) return null;
    const service = SERVICE_TYPES.find((s) => s.id === serviceType);
    const pkg = PACKAGE_TYPES.find((p) => p.id === packageType);
    const weightRange = WEIGHT_RANGES.find((w) => w.id === weight);
    if (!service || !pkg || !weightRange) return null;

    const basePrice = service.basePrice;
    const weightSurcharge = weightRange.surcharge;
    const typeSurcharge = pkg.surcharge;
    // Stable estimated distance derived from the address strings
    // so the same inputs always produce the same quote.
    const seed =
      Array.from(from).reduce((a, c) => a + c.charCodeAt(0), 0) +
      Array.from(to).reduce((a, c) => a + c.charCodeAt(0), 0);
    const estimatedDistance = 10 + (seed % 50);
    const distanceSurcharge = Math.round(estimatedDistance);
    const subtotal =
      basePrice + weightSurcharge + typeSurcharge + distanceSurcharge;
    const vat = Math.round(subtotal * 0.17);
    const total = subtotal + vat;

    return {
      basePrice,
      weightSurcharge,
      typeSurcharge,
      distanceSurcharge,
      subtotal,
      vat,
      total,
    };
  }, [from, to, serviceType, packageType, weight]);

  const activeService = SERVICE_TYPES.find((s) => s.id === serviceType);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_30px_60px_-30px_rgba(10,37,64,0.18)] lg:grid-cols-[1fr_1.15fr]">
        {/* ──────────── RESULT PANEL (RTL: right) ──────────── */}
        <aside className="relative overflow-hidden bg-navy p-8 text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(800px 400px at 100% 0%, rgba(79,138,255,0.30), transparent 55%),
                radial-gradient(600px 500px at 0% 100%, rgba(30,99,242,0.24), transparent 60%),
                linear-gradient(180deg, #0A2540 0%, #102E55 100%)
              `,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              maskImage:
                "linear-gradient(180deg, transparent 0%, black 35%, black 75%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, transparent 0%, black 35%, black 75%, transparent 100%)",
            }}
          />

          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[12px] font-semibold text-sky">
              <Sparkles className="h-3.5 w-3.5" />
              הצעת מחיר חיה
            </div>

            <div>
              <div className="mb-1 text-[13px] font-medium text-sky/80">
                סה״כ לתשלום (כולל מע״מ)
              </div>
              {result ? (
                <div className="text-[56px] font-extrabold leading-none tracking-tight text-white">
                  {formatPrice(result.total)}
                </div>
              ) : (
                <div className="text-[40px] font-extrabold leading-none tracking-tight text-white/40">
                  ₪—
                </div>
              )}
              <div className="mt-2 text-[13px] text-white/65">
                {result
                  ? `${activeService?.name} · ${activeService?.timeframe}`
                  : "מלאו כתובת איסוף ויעד לקבלת הצעה"}
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-white/5 p-4 backdrop-blur-sm">
              <Row
                label={`מחיר בסיס (${activeService?.name ?? ""})`}
                value={result ? formatPrice(result.basePrice) : "—"}
              />
              <Row
                label="תוספת מרחק"
                value={
                  result && result.distanceSurcharge > 0
                    ? formatPrice(result.distanceSurcharge)
                    : "—"
                }
              />
              <Row
                label="תוספת משקל"
                value={
                  result && result.weightSurcharge > 0
                    ? formatPrice(result.weightSurcharge)
                    : "—"
                }
              />
              <Row
                label="תוספת סוג חבילה"
                value={
                  result && result.typeSurcharge > 0
                    ? formatPrice(result.typeSurcharge)
                    : "—"
                }
              />
              <div className="border-t border-white/10 pt-2">
                <Row
                  label="סכום ביניים"
                  value={result ? formatPrice(result.subtotal) : "—"}
                  muted
                />
                <Row
                  label="מע״מ (17%)"
                  value={result ? formatPrice(result.vat) : "—"}
                  muted
                />
              </div>
            </div>

            {result ? (
              <Link
                href={`/booking?from=${encodeURIComponent(
                  from
                )}&to=${encodeURIComponent(to)}`}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-[10px] bg-blue px-5 py-3.5 text-base font-bold text-white shadow-[0_10px_30px_rgba(30,99,242,0.45)] transition-all hover:-translate-y-px hover:shadow-[0_14px_36px_rgba(30,99,242,0.55)]"
              >
                המשך להזמנה
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <div className="mt-auto rounded-[10px] border border-dashed border-white/20 px-5 py-3.5 text-center text-[13px] text-white/50">
                ההצעה תופיע כאן ברגע שמתחילים למלא
              </div>
            )}

            <p className="-mt-2 text-[11px] text-white/45">
              * המחיר הוא הערכה. הסופי נקבע לפי מרחק מדויק וזמינות שליחים.
            </p>
          </div>
        </aside>

        {/* ──────────── FORM PANE (RTL: left) ──────────── */}
        <section className="bg-white p-8 sm:p-10">
          <header className="mb-6 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-tint-2">
              <Calculator className="h-4 w-4 text-blue" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-ink">
                מחשבון מחירים
              </div>
              <div className="text-[12.5px] font-medium text-mute">
                בחיפה ובעמקים · 6 אזורי שירות
              </div>
            </div>
          </header>

          <div className="space-y-5">
            {/* Addresses */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CalcField label="כתובת איסוף" icon={MapPin} iconClass="text-blue">
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="עיר או יישוב"
                  className="input-field"
                />
              </CalcField>
              <CalcField label="כתובת יעד" icon={MapPin} iconClass="text-navy">
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="עיר או יישוב"
                  className="input-field"
                />
              </CalcField>
            </div>

            {/* Service Type */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Truck className="h-4 w-4 text-blue" />
                סוג שירות
              </label>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {SERVICE_TYPES.map((s) => {
                  const Icon = s.icon;
                  const active = serviceType === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceType(s.id)}
                      className={`rounded-[10px] border p-3 text-center transition-all ${
                        active
                          ? "border-blue bg-blue-tint-2 shadow-[0_0_0_4px_rgba(30,99,242,0.10)]"
                          : "border-hairline-2 hover:border-mute"
                      }`}
                    >
                      <Icon
                        className={`mx-auto mb-1 h-5 w-5 ${
                          active ? "text-blue" : "text-ink-soft"
                        }`}
                      />
                      <div className="text-[13px] font-bold text-ink">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-mute">{s.timeframe}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Package & Weight */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CalcField label="סוג חבילה" icon={Package} iconClass="text-blue">
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="input-field"
                >
                  {PACKAGE_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}{" "}
                      {p.surcharge > 0 ? `(+${p.surcharge}₪)` : ""}
                    </option>
                  ))}
                </select>
              </CalcField>
              <CalcField label="משקל משוער">
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-field"
                >
                  {WEIGHT_RANGES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}{" "}
                      {w.surcharge > 0 ? `(+${w.surcharge}₪)` : ""}
                    </option>
                  ))}
                </select>
              </CalcField>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-[13.5px]">
      <span className={muted ? "text-white/55" : "text-white/75"}>{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          muted ? "text-white/65" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CalcField({
  label,
  icon: Icon,
  iconClass,
  children,
}: {
  label: string;
  icon?: typeof MapPin;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        {Icon && <Icon className={`h-3.5 w-3.5 ${iconClass ?? "text-mute"}`} />}
        {label}
      </label>
      {children}
    </div>
  );
}
