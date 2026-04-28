"use client";

import { useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";

export default function FeedbackForm({
  orderNumber,
  alreadyRated,
}: {
  orderNumber: string;
  alreadyRated: number | null;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyRated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>הדירוג שלך:</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-4 h-4 ${
                n <= alreadyRated ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-green-700 font-medium">תודה!</span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-800">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">תודה על הדירוג!</span>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("נא לבחור דירוג");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/track/${encodeURIComponent(orderNumber)}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, feedback: feedback || undefined, phone }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "שליחה נכשלה");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm font-medium">איך היה השירות?</div>

      <div className="flex justify-center gap-1 py-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                n <= (hover || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="טלפון שאיתו ההזמנה בוצעה"
        required
        className="input-field text-sm"
        dir="ltr"
      />

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="פידבק (אופציונלי)"
        rows={2}
        className="input-field text-sm resize-none"
      />

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0 || !phone}
        className="btn-primary w-full text-sm disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {submitting ? "שולח..." : "שלח דירוג"}
      </button>
    </form>
  );
}
