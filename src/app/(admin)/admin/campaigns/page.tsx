"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Plus, Send } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  status: "draft" | "sending" | "sent" | "failed";
  recipients_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

const STATUS_LABELS = {
  draft: "טיוטה",
  sending: "בשליחה",
  sent: "נשלח",
  failed: "נכשל",
} as const;

const STATUS_COLORS = {
  draft: "#9CA3AF",
  sending: "#F59E0B",
  sent: "#10B981",
  failed: "#DC2626",
} as const;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    bodyText: "",
    tagsCsv: "",
    minOrders: "",
    maxDaysSinceLast: "",
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setCampaigns(json.campaigns ?? []);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const tags = form.tagsCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const filter: Record<string, unknown> = {};
      if (tags.length > 0) filter.tags = tags;
      if (form.minOrders) filter.minOrders = Number(form.minOrders);
      if (form.maxDaysSinceLast) filter.maxDaysSinceLast = Number(form.maxDaysSinceLast);

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          bodyText: form.bodyText,
          audienceFilter: filter,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "יצירה נכשלה");
        return;
      }
      setShowCreate(false);
      setForm({ name: "", subject: "", bodyText: "", tagsCsv: "", minOrders: "", maxDaysSinceLast: "" });
      await fetchCampaigns();
    } finally {
      setCreating(false);
    }
  }

  async function send(id: string) {
    if (!confirm("לשלוח את הקמפיין?")) return;
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "שליחה נכשלה");
      }
      await fetchCampaigns();
    } finally {
      setSendingId(null);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-secondary" />
          <h1 className="text-2xl font-bold text-primary">קמפיינים</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          קמפיין חדש
        </button>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="card !p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary">{c.name}</div>
                <div className="text-xs text-muted truncate">{c.subject}</div>
              </div>
              <span
                className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: `${STATUS_COLORS[c.status]}15`,
                  color: STATUS_COLORS[c.status],
                }}
              >
                {STATUS_LABELS[c.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div>
                <span className="text-muted">נמענים:</span>{" "}
                <span className="font-medium">{c.recipients_count}</span>
              </div>
              <div>
                <span className="text-muted">נשלחו:</span>{" "}
                <span className="font-medium text-green-700">{c.delivered_count}</span>
              </div>
              <div>
                <span className="text-muted">נכשלו:</span>{" "}
                <span className="font-medium text-red-700">{c.failed_count}</span>
              </div>
            </div>

            {(c.status === "draft" || c.status === "sending") && (
              <button
                onClick={() => send(c.id)}
                disabled={sendingId === c.id}
                className="btn-primary text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sendingId === c.id
                  ? "שולח..."
                  : c.status === "sending"
                    ? "המשך שליחה"
                    : "שלח כעת"}
              </button>
            )}
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="card text-center py-12 text-muted">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            אין קמפיינים. צור אחד.
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-primary mb-4">קמפיין חדש</h2>
            <form onSubmit={create} className="space-y-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם פנימי (לא נשלח ללקוח)"
                required
                className="input-field text-sm"
              />
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="נושא המייל"
                required
                className="input-field text-sm"
              />
              <textarea
                value={form.bodyText}
                onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                placeholder="תוכן ההודעה (טקסט פשוט)"
                rows={6}
                required
                className="input-field text-sm resize-none"
              />

              <div className="border-t border-border pt-3">
                <div className="text-xs font-medium text-primary mb-2">פילטר קהל יעד (אופציונלי)</div>
                <input
                  type="text"
                  value={form.tagsCsv}
                  onChange={(e) => setForm({ ...form, tagsCsv: e.target.value })}
                  placeholder="תגיות (מופרדות בפסיק) — לדוגמה VIP, חדש"
                  className="input-field text-sm mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.minOrders}
                    onChange={(e) => setForm({ ...form, minOrders: e.target.value })}
                    placeholder="מינ׳ הזמנות"
                    className="input-field text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={form.maxDaysSinceLast}
                    onChange={(e) => setForm({ ...form, maxDaysSinceLast: e.target.value })}
                    placeholder="עד X ימים מהאחרונה"
                    className="input-field text-sm"
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  ללא פילטר = כל הלקוחות הרשומים עם מייל.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 text-sm disabled:opacity-50"
                >
                  {creating ? "יוצר..." : "צור טיוטה"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary text-sm"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
