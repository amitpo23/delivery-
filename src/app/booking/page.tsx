"use client";

import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

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

const TIME_WINDOWS = [
  "08:00–12:00",
  "12:00–16:00",
  "16:00–20:00",
  "כל היום",
];

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
  const [confirmed, setConfirmed] = useState<{ orderNumber: string } | null>(null);

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
    if (size === "S" || size === "M" || size === "L" || size === "XL") patch.size = size;
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
          declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined,
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
            declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined,
            urgency: form.urgency,
            timeWindow: form.timeWindow,
            distanceKm,
            quoteTotal: quote.total,
            bookerFullName: form.card.holderName,
            // The booking form doesn't collect a separate booker email
            // today — Sumit will email the tax invoice using whatever
            // the customer types into the hosted page. A future PR can
            // wire up a Step3 email field for our branded confirmation.
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
          declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined,
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

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-primary mb-2">ההזמנה אושרה!</h1>
        <p className="text-muted mb-4">קישור למעקב נשלח אליך ב־SMS</p>
        <div className="card !p-6 my-6">
          <div className="text-sm text-muted mb-1">מספר הזמנה</div>
          <div className="text-2xl font-bold text-primary" dir="ltr">
            {confirmed.orderNumber}
          </div>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href={`/track/${confirmed.orderNumber}`} className="btn-primary">
            מעקב חי
          </Link>
          <Link href="/" className="btn-secondary">
            לעמוד הראשי
          </Link>
        </div>
      </div>
    );
  }

  // Show the demo banner unless we've explicitly flipped to live mode in env.
  // Default to "demo" so a fresh deploy without Sumit/Grow keys can't claim
  // it charged a real card.
  const isLivePayment = process.env.NEXT_PUBLIC_PAYMENT_LIVE === "true";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">הזמנת משלוח</h1>
      <p className="text-muted mb-6">3 שלבים, בלי הרשמה</p>

      {!isLivePayment && (
        <div className="card !p-3 mb-4 bg-amber-50 border-amber-300 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>מצב הדגמה.</strong> תשלום לא נגבה בפועל וההודעות לא נשלחות בפועל.
            ההזמנה תיווצר במערכת לצורך בדיקה.
          </div>
        </div>
      )}

      <StepsIndicator current={step} />

      <div className="card !p-6 md:!p-8">
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

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border gap-3">
          {step > 1 ? (
            <button onClick={back} className="btn-secondary">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </button>
          ) : (
            <Link href="/" className="text-sm text-muted hover:text-primary">
              ← ביטול
            </Link>
          )}

          {step < 3 ? (
            <button
              onClick={next}
              disabled={(step === 1 && !step1Valid()) || (step === 2 && !step2Valid())}
              className="btn-primary disabled:opacity-50"
            >
              הבא
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!quote || !step3Valid() || submitting}
              className="btn-primary !bg-green-600 hover:!bg-green-700 disabled:opacity-50 !py-3 !px-6"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              אישור הזמנה {quote ? `· ${formatPrice(quote.total)}` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepsIndicator({ current }: { current: Step }) {
  const items: { n: Step; label: string; icon: typeof MapPin }[] = [
    { n: 1, label: "כתובות", icon: MapPin },
    { n: 2, label: "חבילה", icon: Package },
    { n: 3, label: "תשלום", icon: CreditCard },
  ];
  return (
    <div className="flex items-center justify-between mb-6">
      {items.map((it, i) => {
        const Icon = it.icon;
        const done = it.n < current;
        const active = it.n === current;
        return (
          <div key={it.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  done ? "bg-accent text-white" : active ? "bg-secondary text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-1 ${active ? "text-secondary font-medium" : "text-muted"}`}>
                {it.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${it.n < current ? "bg-accent" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1Addresses({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="איסוף" icon={MapPin}>
        <Input
          label="כתובת איסוף"
          value={form.pickupAddress}
          onChange={(v) => update("pickupAddress", v)}
          placeholder="עיר, רחוב, מספר בית"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="שם איש קשר"
            value={form.pickupContactName}
            onChange={(v) => update("pickupContactName", v)}
            icon={User}
            required
          />
          <Input
            label="טלפון"
            value={form.pickupContactPhone}
            onChange={(v) => update("pickupContactPhone", v)}
            icon={Phone}
            type="tel"
            ltr
            required
          />
        </div>
        <Input
          label="הערות לשליח (אופציונלי)"
          value={form.pickupNotes}
          onChange={(v) => update("pickupNotes", v)}
          placeholder="קומה, דירה, קוד כניסה..."
        />
      </Section>

      <Section title="מסירה" icon={MapPin}>
        <Input
          label="כתובת יעד"
          value={form.deliveryAddress}
          onChange={(v) => update("deliveryAddress", v)}
          placeholder="עיר, רחוב, מספר בית"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="שם מקבל"
            value={form.deliveryContactName}
            onChange={(v) => update("deliveryContactName", v)}
            icon={User}
            required
          />
          <Input
            label="טלפון מקבל"
            value={form.deliveryContactPhone}
            onChange={(v) => update("deliveryContactPhone", v)}
            icon={Phone}
            type="tel"
            ltr
            required
          />
        </div>
        <Input
          label="הערות מסירה (אופציונלי)"
          value={form.deliveryNotes}
          onChange={(v) => update("deliveryNotes", v)}
        />
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
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">גודל חבילה</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(SIZE_LABELS) as Size[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update("size", s)}
              className={`p-3 rounded-xl border-2 text-right transition-all ${
                form.size === s
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-sm text-primary">{SIZE_LABELS[s].label}</div>
              <div className="text-xs text-muted mt-1">{SIZE_LABELS[s].hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
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
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">דחיפות</label>
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
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:border-gray-300">
          <input
            type="checkbox"
            checked={form.fragile}
            onChange={(e) => update("fragile", e.target.checked)}
          />
          <div>
            <div className="font-medium text-sm">חבילה שבירה</div>
            <div className="text-xs text-muted">תוספת ₪15 לטיפול בעדינות</div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:border-gray-300">
          <input
            type="checkbox"
            checked={form.insurance}
            onChange={(e) => update("insurance", e.target.checked)}
          />
          <div className="flex-1">
            <div className="font-medium text-sm">ביטוח חבילה</div>
            <div className="text-xs text-muted">2% מהערך המוצהר, מינימום ₪5</div>
          </div>
        </label>

        {form.insurance && (
          <Input
            label="ערך מוצהר (₪)"
            value={form.declaredValue}
            onChange={(v) => update("declaredValue", v)}
            type="number"
            ltr
            required
          />
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
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline ml-1" />
          חלון זמן מועדף
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw}
              type="button"
              onClick={() => update("timeWindow", tw)}
              className={`px-3 py-2 rounded-lg border-2 text-sm ${
                form.timeWindow === tw
                  ? "border-secondary bg-secondary/5 text-secondary font-medium"
                  : "border-border text-gray-700"
              }`}
            >
              {tw}
            </button>
          ))}
        </div>
      </div>

      <QuoteCard quote={quote} loading={quoteLoading} error={quoteError} />

      <div className="space-y-3">
        <h3 className="font-bold text-primary">פרטי תשלום</h3>
        <Input
          label="שם בעל הכרטיס"
          value={form.card.holderName}
          onChange={(v) => update("card", { ...form.card, holderName: v })}
          required
        />
        <Input
          label="מספר כרטיס"
          value={form.card.number}
          onChange={(v) => update("card", { ...form.card, number: v })}
          placeholder="0000 0000 0000 0000"
          ltr
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="תוקף (MM/YY)"
            value={form.card.exp}
            onChange={(v) => update("card", { ...form.card, exp: v })}
            placeholder="12/27"
            ltr
            required
          />
          <Input
            label="CVV"
            value={form.card.cvv}
            onChange={(v) => update("card", { ...form.card, cvv: v })}
            type="password"
            ltr
            required
          />
        </div>
      </div>
    </div>
  );
}

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
      <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-2 text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        מחשב מחיר...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }
  if (!quote) return null;
  return (
    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-green-900">סה״כ לתשלום</span>
        <span className="text-3xl font-bold text-green-900">{formatPrice(quote.total)}</span>
      </div>
      <div className="text-xs text-green-800/80 space-y-0.5">
        <div>אזור איסוף: {quote.breakdown.pickupZone} · מסירה: {quote.breakdown.deliveryZone}</div>
        <div>
          סכום ביניים {formatPrice(quote.subtotal)} · מע״מ {formatPrice(quote.vat)}
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
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        <Icon className="w-5 h-5 text-secondary" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  ltr,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  ltr?: boolean;
  icon?: typeof MapPin;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {Icon && <Icon className="w-3 h-3 inline ml-1" />}
        {label}
        {required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        required={required}
      />
    </div>
  );
}
