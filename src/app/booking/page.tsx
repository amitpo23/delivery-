"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  MapPin,
  Package,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { SplitShell, type SplitStep } from "@/components/ui/split-shell";

type Step = 1 | 2 | 3;
type Size = "S" | "M" | "L" | "XL";
type Urgency = "express" | "same_day" | "next_day" | "economy";

interface FormState {
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupNotes: string;
  deliveryAddress: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryNotes: string;
  size: Size;
  category: string;
  fragile: boolean;
  insurance: boolean;
  declaredValue: string;
  urgency: Urgency;
  timeWindow: string;
  card: { holderName: string; number: string; exp: string; cvv: string };
}

interface Quote {
  total: number;
  subtotal: number;
  vat: number;
  basePrice: number;
  distanceCost: number;
  weightFactor: number;
  zoneFactor: number;
  urgencyFactor: number;
  fragileSurcharge: number;
  insuranceFee: number;
  surge: number;
  breakdown: { pickupZone: string; deliveryZone: string; formula: string };
}

const SIZE_LABELS: Record<Size, { label: string; hint: string }> = {
  S: { label: "S — קטן", hint: "עד 3 ק״ג, מסמכים/אריזה קטנה" },
  M: { label: "M — בינוני", hint: "3–10 ק״ג, חבילה רגילה" },
  L: { label: "L — גדול", hint: "10–25 ק״ג" },
  XL: { label: "XL — גדול במיוחד", hint: "25 ק״ג ומעלה" },
};

const URGENCY_OPTIONS: { id: Urgency; label: string; sub: string }[] = [
  { id: "express", label: "אקספרס", sub: "2–4 שעות" },
  { id: "same_day", label: "באותו יום", sub: "עד סוף היום" },
  { id: "next_day", label: "יום עסקים הבא", sub: "ברירת מחדל" },
  { id: "economy", label: "חסכוני", sub: "2–3 ימי עסקים" },
];

const CATEGORIES = ["מסמכים", "מזון", "אופנה", "אלקטרוניקה", "מוצרי בית", "אחר"];

const TIME_WINDOWS = ["08:00–12:00", "12:00–16:00", "16:00–20:00", "כל היום"];

const COVERAGE = [
  "חיפה",
  "עפולה",
  "מ.א. מגידו",
  "מ.א. גלבוע",
  "בקעת בית שאן",
  "התענכים",
];

const STEPS: SplitStep[] = [
  { num: 1, name: "כתובות", est: "~3 דק׳" },
  { num: 2, name: "חבילה", est: "2 דק׳" },
  { num: 3, name: "תשלום", est: "1 דק׳" },
];

const STEP_PANELS: Record<
  Step,
  { eyebrow: string; title: ReactNode; lede: string }
> = {
  1: {
    eyebrow: "שלב 1 מתוך 3 · 5 דקות בלבד",
    title: (
      <>
        בואו נסדר<br />את <span className="text-blue-2">השליחות</span>.
      </>
    ),
    lede:
      "כתובת איסוף, כתובת מסירה, ופרטי איש קשר בכל קצה. נגיע במדויק וברגע הנכון.",
  },
  2: {
    eyebrow: "שלב 2 מתוך 3",
    title: (
      <>
        מה <span className="text-blue-2">אתם</span> שולחים?
      </>
    ),
    lede:
      "גודל החבילה, קטגוריה ודחיפות — כך נחשב מחיר הוגן ונבחר את השליח המתאים.",
  },
  3: {
    eyebrow: "שלב 3 מתוך 3 · רגע לסיום",
    title: (
      <>
        סיום <span className="text-blue-2">והזמנה</span>.
      </>
    ),
    lede:
      "אישור פרטי תשלום, חלון זמן מועדף, וההזמנה יוצאת לדרך. נשלח SMS עם קישור למעקב.",
  },
};

const initialState: FormState = {
  pickupAddress: "",
  pickupContactName: "",
  pickupContactPhone: "",
  pickupNotes: "",
  deliveryAddress: "",
  deliveryContactName: "",
  deliveryContactPhone: "",
  deliveryNotes: "",
  size: "S",
  category: "מסמכים",
  fragile: false,
  insurance: false,
  declaredValue: "",
  urgency: "next_day",
  timeWindow: "כל היום",
  card: { holderName: "", number: "", exp: "", cvv: "" },
};

function estimateDistanceKm(pickup: string, delivery: string): number {
  const norm = (s: string) => s.trim().toLowerCase();
  if (!pickup || !delivery) return 5;
  if (norm(pickup) === norm(delivery)) return 3;
  const sharedWord = pickup.split(/[\s,]/)[0] === delivery.split(/[\s,]/)[0];
  return sharedWord ? 8 : 25;
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ orderNumber: string } | null>(
    null
  );

  // Prefill from query string when arriving from a bot deep-link or the
  // homepage price calculator. Read on mount only — we don't want users
  // changing one field to trigger a remount that resets their other edits.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const patch: Partial<FormState> = {};
    const from = params.get("from");
    const to = params.get("to");
    const size = params.get("size");
    const urgency = params.get("urgency");
    const name = params.get("name");
    const pickupPhone = params.get("pickupPhone");
    const deliveryPhone = params.get("deliveryPhone");
    if (from) patch.pickupAddress = from;
    if (to) patch.deliveryAddress = to;
    if (size === "S" || size === "M" || size === "L" || size === "XL")
      patch.size = size;
    if (
      urgency === "express" ||
      urgency === "same_day" ||
      urgency === "next_day" ||
      urgency === "economy"
    ) {
      patch.urgency = urgency;
    }
    // The bot collects only the booker's name (= sender at pickup). The
    // recipient's name is a separate field and stays empty so the user
    // can fill it in at /booking — overwriting it with the booker's name
    // would silently mislabel deliveries.
    if (name) {
      patch.pickupContactName = name;
    }
    if (pickupPhone) patch.pickupContactPhone = pickupPhone;
    if (deliveryPhone) patch.deliveryContactPhone = deliveryPhone;
    if (Object.keys(patch).length > 0) {
      setForm((prev) => ({ ...prev, ...patch }));
    }
  }, []);

  const distanceKm = useMemo(
    () => estimateDistanceKm(form.pickupAddress, form.deliveryAddress),
    [form.pickupAddress, form.deliveryAddress]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function step1Valid() {
    return (
      form.pickupAddress.trim().length > 1 &&
      form.pickupContactName.trim() &&
      form.pickupContactPhone.trim() &&
      form.deliveryAddress.trim().length > 1 &&
      form.deliveryContactName.trim() &&
      form.deliveryContactPhone.trim()
    );
  }

  function step2Valid() {
    if (form.insurance) {
      const v = Number(form.declaredValue);
      if (!Number.isFinite(v) || v <= 0) return false;
    }
    return true;
  }

  function step3Valid() {
    const c = form.card;
    return (
      c.holderName.trim() &&
      c.number.replace(/\s/g, "").length >= 13 &&
      /^\d{2}\/\d{2}$/.test(c.exp) &&
      /^\d{3,4}$/.test(c.cvv)
    );
  }

  async function fetchQuote() {
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/pricing/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: form.pickupAddress,
          deliveryAddress: form.deliveryAddress,
          distanceKm,
          size: form.size,
          urgency: form.urgency,
          fragile: form.fragile,
          insurance: form.insurance,
          declaredValue: form.declaredValue
            ? Number(form.declaredValue)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data?.error ?? "שגיאה בחישוב מחיר");
        setQuote(null);
        return;
      }
      setQuote(data.quote);
    } catch {
      setQuoteError("נכשלה התקשרות לשרת");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function next() {
    if (step === 1 && step1Valid()) {
      setStep(2);
    } else if (step === 2 && step2Valid()) {
      await fetchQuote();
      setStep(3);
    }
  }

  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    if (!quote || !step3Valid()) return;
    setSubmitting(true);
    try {
      // Live payment: kick off Sumit's hosted page (PCI-safe) and let
      // it own the redirect. We don't ship card fields anywhere on
      // our domain. /api/payment/begin creates the order, then returns
      // the URL we navigate to.
      const useHostedPayment = process.env.NEXT_PUBLIC_PAYMENT_LIVE === "true";

      if (useHostedPayment) {
        const res = await fetch("/api/payment/begin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupAddress: form.pickupAddress,
            pickupContactName: form.pickupContactName,
            pickupContactPhone: form.pickupContactPhone,
            pickupNotes: form.pickupNotes,
            deliveryAddress: form.deliveryAddress,
            deliveryContactName: form.deliveryContactName,
            deliveryContactPhone: form.deliveryContactPhone,
            deliveryNotes: form.deliveryNotes,
            size: form.size,
            category: form.category,
            fragile: form.fragile,
            insurance: form.insurance,
            declaredValue: form.declaredValue
              ? Number(form.declaredValue)
              : undefined,
            urgency: form.urgency,
            timeWindow: form.timeWindow,
            distanceKm,
            quoteTotal: quote.total,
            bookerFullName: form.card.holderName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.redirectUrl) {
          setQuoteError(data?.error ?? "התחלת התשלום נכשלה");
          return;
        }
        window.location.assign(data.redirectUrl);
        return;
      }

      // Demo / stub path — keeps the old behaviour when payment is
      // disabled so devs can test the booking flow end-to-end.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: form.pickupAddress,
          pickupContactName: form.pickupContactName,
          pickupContactPhone: form.pickupContactPhone,
          pickupNotes: form.pickupNotes,
          deliveryAddress: form.deliveryAddress,
          deliveryContactName: form.deliveryContactName,
          deliveryContactPhone: form.deliveryContactPhone,
          deliveryNotes: form.deliveryNotes,
          size: form.size,
          category: form.category,
          fragile: form.fragile,
          insurance: form.insurance,
          declaredValue: form.declaredValue
            ? Number(form.declaredValue)
            : undefined,
          urgency: form.urgency,
          timeWindow: form.timeWindow,
          distanceKm,
          quoteTotal: quote.total,
          card: {
            holderName: form.card.holderName,
            last4: form.card.number.replace(/\s/g, "").slice(-4),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuoteError(data?.error ?? "ההזמנה נכשלה");
        return;
      }
      setConfirmed({ orderNumber: data.orderNumber });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────────
  // Confirmation screen
  // ────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-blue-tint">
            <CheckCircle2 className="h-10 w-10 text-blue" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-ink">
            ההזמנה אושרה!
          </h1>
          <p className="mb-6 text-ink-soft">קישור למעקב נשלח אליך ב־SMS</p>
          <div className="card mb-6 !p-6">
            <div className="mb-1 text-sm text-mute">מספר הזמנה</div>
            <div
              className="text-2xl font-extrabold tracking-tight text-ink"
              dir="ltr"
            >
              {confirmed.orderNumber}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/track/${confirmed.orderNumber}`}
              className="btn-primary"
            >
              מעקב חי
            </Link>
            <Link href="/" className="btn-secondary">
              לעמוד הראשי
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show the demo banner unless we've explicitly flipped to live mode in env.
  const isLivePayment = process.env.NEXT_PUBLIC_PAYMENT_LIVE === "true";

  const panel = STEP_PANELS[step];
  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <SplitShell
      step={step}
      steps={STEPS}
      panelEyebrow={panel.eyebrow}
      panelTitle={panel.title}
      panelLede={panel.lede}
      panelExtra={
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky/80">
            אזורי שירות
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COVERAGE.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[12.5px] font-medium text-white/85"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      }
      topRight={
        <>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
            שירות פעיל בצפון
          </span>
          <span>
            צריכים עזרה?{" "}
            <a
              href="tel:0500000000"
              className="border-b border-hairline-2 pb-px text-ink hover:border-ink"
            >
              04-000-0000
            </a>
          </span>
        </>
      }
    >
      {!isLivePayment && (
        <div className="flex items-start gap-2 rounded-[10px] border border-amber-300 bg-amber-50 p-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <strong>מצב הדגמה.</strong> תשלום לא נגבה בפועל וההודעות לא נשלחות.
            ההזמנה תיווצר במערכת לצורך בדיקה.
          </div>
        </div>
      )}

      <header>
        <h2 className="m-0 mb-1 text-2xl font-extrabold tracking-tight text-ink">
          {step === 1
            ? "פרטי האיסוף והמסירה"
            : step === 2
            ? "פרטי החבילה"
            : "תשלום ואישור"}
        </h2>
        <p className="m-0 text-[15px] text-ink-soft">
          {step === 1
            ? "כל מה שנצטרך כדי להגיע אליכם בדיוק."
            : step === 2
            ? "נתאים מחיר ושליח לפי מה שנשלח."
            : "פרטי כרטיס וחלון זמן מועדף."}
        </p>
      </header>

      <div>
        {step === 1 && <Step1Addresses form={form} update={update} />}
        {step === 2 && <Step2Package form={form} update={update} />}
        {step === 3 && (
          <Step3Pay
            form={form}
            update={update}
            quote={quote}
            quoteLoading={quoteLoading}
            quoteError={quoteError}
          />
        )}
      </div>

      {/* Action row */}
      <div className="mt-auto flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[13px] font-medium text-mute">
          <div className="relative h-1 w-48 overflow-hidden rounded-full bg-hairline">
            <div
              className="absolute inset-y-0 right-0 bg-blue transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span>
            <b className="text-ink">{progressPct}%</b> · שלב {step}/3
          </span>
        </div>

        <div className="flex gap-2.5">
          {step > 1 ? (
            <button onClick={back} className="btn-secondary">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              ← ביטול
            </Link>
          )}

          {step < 3 ? (
            <button
              onClick={next}
              disabled={
                (step === 1 && !step1Valid()) ||
                (step === 2 && !step2Valid())
              }
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {step === 1 ? "המשך אל החבילה" : "המשך אל התשלום"}
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!quote || !step3Valid() || submitting}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              אישור הזמנה {quote ? `· ${formatPrice(quote.total)}` : ""}
            </button>
          )}
        </div>
      </div>
    </SplitShell>
  );
}

// ──────────────────────────────────────────────────
// Step components
// ──────────────────────────────────────────────────

function Step1Addresses({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-7">
      <Section title="איסוף" icon={MapPin}>
        <Field label="כתובת איסוף" required>
          <input
            value={form.pickupAddress}
            onChange={(e) => update("pickupAddress", e.target.value)}
            placeholder="עיר, רחוב, מספר בית"
            className="input-field"
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="שם איש קשר" icon={User} required>
            <input
              value={form.pickupContactName}
              onChange={(e) => update("pickupContactName", e.target.value)}
              placeholder="שם מלא"
              className="input-field"
              required
            />
          </Field>
          <Field label="טלפון" icon={Phone} required>
            <input
              type="tel"
              value={form.pickupContactPhone}
              onChange={(e) => update("pickupContactPhone", e.target.value)}
              placeholder="050-000-0000"
              className="input-field"
              dir="ltr"
              required
            />
          </Field>
        </div>
        <Field label="הערות לשליח" optional>
          <input
            value={form.pickupNotes}
            onChange={(e) => update("pickupNotes", e.target.value)}
            placeholder="קומה, דירה, קוד כניסה..."
            className="input-field"
          />
        </Field>
      </Section>

      <Section title="מסירה" icon={MapPin}>
        <Field label="כתובת יעד" required>
          <input
            value={form.deliveryAddress}
            onChange={(e) => update("deliveryAddress", e.target.value)}
            placeholder="עיר, רחוב, מספר בית"
            className="input-field"
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="שם מקבל" icon={User} required>
            <input
              value={form.deliveryContactName}
              onChange={(e) => update("deliveryContactName", e.target.value)}
              placeholder="שם מלא"
              className="input-field"
              required
            />
          </Field>
          <Field label="טלפון מקבל" icon={Phone} required>
            <input
              type="tel"
              value={form.deliveryContactPhone}
              onChange={(e) => update("deliveryContactPhone", e.target.value)}
              placeholder="050-000-0000"
              className="input-field"
              dir="ltr"
              required
            />
          </Field>
        </div>
        <Field label="הערות מסירה" optional>
          <input
            value={form.deliveryNotes}
            onChange={(e) => update("deliveryNotes", e.target.value)}
            className="input-field"
          />
        </Field>
      </Section>
    </div>
  );
}

function Step2Package({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">
          גודל חבילה
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(SIZE_LABELS) as Size[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update("size", s)}
              className={`rounded-[10px] border p-3 text-right transition-all ${
                form.size === s
                  ? "border-blue bg-blue-tint-2 shadow-[0_0_0_4px_rgba(30,99,242,0.10)]"
                  : "border-hairline-2 hover:border-mute"
              }`}
            >
              <div className="text-sm font-bold text-ink">
                {SIZE_LABELS[s].label}
              </div>
              <div className="mt-1 text-xs text-mute">{SIZE_LABELS[s].hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="קטגוריה">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="input-field"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="דחיפות">
          <select
            value={form.urgency}
            onChange={(e) => update("urgency", e.target.value as Urgency)}
            className="input-field"
          >
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} — {u.sub}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-hairline-2 p-3 transition-colors hover:border-mute">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(e) => update("fragile", e.target.checked)}
            className="h-4 w-4 accent-blue"
          />
          <div>
            <div className="text-sm font-semibold text-ink">חבילה שבירה</div>
            <div className="text-xs text-mute">תוספת ₪15 לטיפול בעדינות</div>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-hairline-2 p-3 transition-colors hover:border-mute">
          <input
            type="checkbox"
            checked={form.insurance}
            onChange={(e) => update("insurance", e.target.checked)}
            className="h-4 w-4 accent-blue"
          />
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">ביטוח חבילה</div>
            <div className="text-xs text-mute">2% מהערך המוצהר, מינימום ₪5</div>
          </div>
        </label>

        {form.insurance && (
          <Field label="ערך מוצהר (₪)" required>
            <input
              type="number"
              value={form.declaredValue}
              onChange={(e) => update("declaredValue", e.target.value)}
              dir="ltr"
              className="input-field"
              required
            />
          </Field>
        )}
      </div>
    </div>
  );
}

function Step3Pay({
  form,
  update,
  quote,
  quoteLoading,
  quoteError,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  quote: Quote | null;
  quoteLoading: boolean;
  quoteError: string | null;
}) {
  return (
    <div className="space-y-7">
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Clock className="h-4 w-4 text-blue" />
          חלון זמן מועדף
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw}
              type="button"
              onClick={() => update("timeWindow", tw)}
              className={`rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-all ${
                form.timeWindow === tw
                  ? "border-blue bg-blue-tint-2 text-ink"
                  : "border-hairline-2 text-ink-soft hover:border-mute"
              }`}
            >
              {tw}
            </button>
          ))}
        </div>
      </div>

      <QuoteCard quote={quote} loading={quoteLoading} error={quoteError} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-ink-soft">
          פרטי תשלום
        </h3>
        <Field label="שם בעל הכרטיס" required>
          <input
            value={form.card.holderName}
            onChange={(e) =>
              update("card", { ...form.card, holderName: e.target.value })
            }
            className="input-field"
            required
          />
        </Field>
        <Field label="מספר כרטיס" required>
          <input
            value={form.card.number}
            onChange={(e) =>
              update("card", { ...form.card, number: e.target.value })
            }
            placeholder="0000 0000 0000 0000"
            dir="ltr"
            className="input-field"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="תוקף (MM/YY)" required>
            <input
              value={form.card.exp}
              onChange={(e) =>
                update("card", { ...form.card, exp: e.target.value })
              }
              placeholder="12/27"
              dir="ltr"
              className="input-field"
              required
            />
          </Field>
          <Field label="CVV" required>
            <input
              type="password"
              value={form.card.cvv}
              onChange={(e) =>
                update("card", { ...form.card, cvv: e.target.value })
              }
              dir="ltr"
              className="input-field"
              required
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function QuoteCard({
  quote,
  loading,
  error,
}: {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] border border-hairline bg-paper p-4 text-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
        מחשב מחיר...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-[12px] border border-red-200 bg-red-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }
  if (!quote) return null;
  return (
    <div className="rounded-[14px] border border-blue/25 bg-gradient-to-br from-blue-tint-2 to-blue-tint p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-soft">סה״כ לתשלום</span>
        <span className="text-3xl font-extrabold tracking-tight text-ink">
          {formatPrice(quote.total)}
        </span>
      </div>
      <div className="space-y-1 text-xs text-ink-soft/85">
        <div>
          אזור איסוף: {quote.breakdown.pickupZone} · מסירה:{" "}
          {quote.breakdown.deliveryZone}
        </div>
        <div>
          סכום ביניים {formatPrice(quote.subtotal)} · מע״מ{" "}
          {formatPrice(quote.vat)}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3.5">
      <h3 className="flex items-center gap-2 text-base font-bold text-ink">
        <Icon className="h-4 w-4 text-blue" />
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center justify-between text-[13px] font-semibold text-ink">
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-mute" />}
          {label}
          {required && <span className="text-blue">*</span>}
        </span>
        {optional && (
          <span className="text-xs font-medium text-mute">לא חובה</span>
        )}
      </label>
      {children}
    </div>
  );
}
