"use client";

import { useState } from "react";
import { AlertCircle, Send } from "lucide-react";

const CATEGORIES = [
  { value: "damaged", label: "חבילה פגומה" },
  { value: "missing", label: "חבילה חסרה / לא הגיעה" },
  { value: "wrong_address", label: "נמסר לכתובת שגויה" },
  { value: "late", label: "איחור משמעותי" },
  { value: "return_request", label: "בקשת החזרה" },
  { value: "other", label: "אחר" },
] as const;

export default function ComplaintButton({ orderNumber }: { orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]["value"]>("damaged");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { ok: true; ticketNumber: string } | { ok: false; error: string } | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/track/${encodeURIComponent(orderNumber)}/complaint`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, category, description }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, error: json.error ?? "פתיחת הפנייה נכשלה" });
        return;
      }
      setResult({ ok: true, ticketNumber: json.ticket?.ticket_number ?? "" });
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5 font-medium"
      >
        <AlertCircle className="w-4 h-4" />
        דווח על בעיה
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-primary mb-1">דיווח על בעיה</h2>
            <p className="text-xs text-muted mb-4" dir="ltr">
              {orderNumber}
            </p>

            {result?.ok ? (
              <div className="card !p-4 bg-green-50 border-green-200 text-center">
                <div className="text-sm font-medium text-green-800 mb-2">הפנייה נפתחה ✓</div>
                <div className="text-xs text-green-700">
                  מספר פנייה: <span className="font-mono" dir="ltr">{result.ticketNumber}</span>
                </div>
                <div className="text-xs text-muted mt-2">
                  צוות השירות יחזור אליך בהקדם.
                </div>
                <button onClick={() => setOpen(false)} className="btn-secondary text-sm mt-4">
                  סגור
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1">טלפון שאיתו ההזמנה בוצעה</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="input-field text-sm"
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">סוג הבעיה</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="input-field text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1">תיאור</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    minLength={5}
                    className="input-field text-sm resize-none"
                    placeholder="ספר לנו מה קרה..."
                  />
                </div>

                {result && !result.ok && (
                  <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                    {result.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !phone || description.length < 5}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "שולח..." : "שלח"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-secondary text-sm"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
