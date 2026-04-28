"use client";

import { useEffect, useState, useCallback } from "react";
import { Repeat, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Recurring {
  id: string;
  name: string;
  pickup_address: string;
  delivery_address: string;
  size: string;
  urgency: string;
  frequency: string;
  weekday: number | null;
  hour_of_day: number;
  next_run_at: string;
  active: boolean;
  runs: { id: string; status: string }[];
}

const FREQ_LABELS: Record<string, string> = {
  daily: "יומי",
  weekly: "שבועי",
  biweekly: "דו-שבועי",
  monthly: "חודשי",
};

const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bookerFullName: "",
    bookerPhone: "",
    pickupAddress: "",
    pickupContactName: "",
    pickupContactPhone: "",
    deliveryAddress: "",
    deliveryContactName: "",
    deliveryContactPhone: "",
    size: "M",
    urgency: "next_day",
    frequency: "daily",
    weekday: "",
    hourOfDay: 6,
    notes: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recurring");
      if (!res.ok) {
        setError("טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setItems(json.recurring ?? []);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const body = {
        name: form.name,
        bookerFullName: form.bookerFullName,
        bookerPhone: form.bookerPhone,
        pickupAddress: form.pickupAddress,
        pickupContactName: form.pickupContactName,
        pickupContactPhone: form.pickupContactPhone,
        deliveryAddress: form.deliveryAddress,
        deliveryContactName: form.deliveryContactName,
        deliveryContactPhone: form.deliveryContactPhone,
        size: form.size,
        urgency: form.urgency,
        frequency: form.frequency,
        weekday: form.weekday !== "" ? Number(form.weekday) : null,
        hourOfDay: Number(form.hourOfDay),
        notes: form.notes || undefined,
      };
      const res = await fetch("/api/admin/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "יצירה נכשלה");
        return;
      }
      setShowCreate(false);
      await fetchItems();
    } finally {
      setCreating(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/recurring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await fetchItems();
  }

  async function remove(id: string) {
    if (!confirm("למחוק את המשימה החוזרת?")) return;
    await fetch(`/api/admin/recurring/${id}`, { method: "DELETE" });
    await fetchItems();
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Repeat className="w-6 h-6 text-secondary" />
          <h1 className="text-2xl font-bold text-primary">הזמנות חוזרות</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          חדש
        </button>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="card !p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary">{r.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {r.pickup_address} → {r.delivery_address}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggle(r.id, r.active)}
                  className={r.active ? "text-green-600" : "text-gray-400"}
                  title={r.active ? "השבת" : "הפעל"}
                >
                  {r.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
                <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted">תדירות:</span>{" "}
                <span className="font-medium">{FREQ_LABELS[r.frequency]}</span>
                {r.weekday !== null && (
                  <span> · {WEEKDAY_LABELS[r.weekday]}</span>
                )}
              </div>
              <div>
                <span className="text-muted">שעה:</span>{" "}
                <span className="font-medium">{r.hour_of_day}:00</span>
              </div>
              <div>
                <span className="text-muted">{r.size}</span> ·{" "}
                <span className="font-medium">{r.urgency}</span>
              </div>
              <div>
                <span className="text-muted">ריצה הבאה:</span>{" "}
                <span className="font-medium" dir="ltr">
                  {new Date(r.next_run_at).toLocaleString("he-IL")}
                </span>
              </div>
            </div>
            {r.runs.length > 0 && (
              <div className="text-xs text-muted mt-2 pt-2 border-t border-border">
                {r.runs.length} ריצות · {r.runs.filter((x) => x.status === "ok").length} הצליחו
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="card text-center py-12 text-muted">
            <Repeat className="w-12 h-12 mx-auto mb-3 opacity-30" />
            אין משימות חוזרות
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-primary mb-4">משימה חוזרת חדשה</h2>
            <form onSubmit={create} className="space-y-3">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="שם משימה"
                required
                className="input-field text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.bookerFullName}
                  onChange={(e) => setForm({ ...form, bookerFullName: e.target.value })}
                  placeholder="שם המזמין"
                  required
                  className="input-field text-sm"
                />
                <input
                  type="tel"
                  value={form.bookerPhone}
                  onChange={(e) => setForm({ ...form, bookerPhone: e.target.value })}
                  placeholder="טלפון מזמין"
                  required
                  className="input-field text-sm"
                  dir="ltr"
                />
              </div>
              <input
                type="text"
                value={form.pickupAddress}
                onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
                placeholder="כתובת איסוף"
                required
                className="input-field text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.pickupContactName}
                  onChange={(e) => setForm({ ...form, pickupContactName: e.target.value })}
                  placeholder="איש קשר באיסוף"
                  required
                  className="input-field text-sm"
                />
                <input
                  type="tel"
                  value={form.pickupContactPhone}
                  onChange={(e) => setForm({ ...form, pickupContactPhone: e.target.value })}
                  placeholder="טלפון איסוף"
                  required
                  className="input-field text-sm"
                  dir="ltr"
                />
              </div>
              <input
                type="text"
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                placeholder="כתובת מסירה"
                required
                className="input-field text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.deliveryContactName}
                  onChange={(e) => setForm({ ...form, deliveryContactName: e.target.value })}
                  placeholder="איש קשר במסירה"
                  required
                  className="input-field text-sm"
                />
                <input
                  type="tel"
                  value={form.deliveryContactPhone}
                  onChange={(e) => setForm({ ...form, deliveryContactPhone: e.target.value })}
                  placeholder="טלפון מסירה"
                  required
                  className="input-field text-sm"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <select
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
                <select
                  value={form.urgency}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="economy">חסכון</option>
                  <option value="next_day">יום למחרת</option>
                  <option value="same_day">באותו יום</option>
                  <option value="express">אקספרס</option>
                </select>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="daily">יומי</option>
                  <option value="weekly">שבועי</option>
                  <option value="biweekly">דו-שבועי</option>
                  <option value="monthly">חודשי</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.hourOfDay}
                  onChange={(e) => setForm({ ...form, hourOfDay: Number(e.target.value) })}
                  className="input-field text-sm"
                  placeholder="שעה"
                />
              </div>
              {(form.frequency === "weekly" || form.frequency === "biweekly") && (
                <select
                  value={form.weekday}
                  onChange={(e) => setForm({ ...form, weekday: e.target.value })}
                  required
                  className="input-field text-sm"
                >
                  <option value="">בחר יום בשבוע</option>
                  {WEEKDAY_LABELS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="הערות (אופציונלי)"
                rows={2}
                className="input-field text-sm resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="btn-primary flex-1 text-sm disabled:opacity-50">
                  {creating ? "יוצר..." : "צור"}
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
