"use client";

import { useEffect, useState, useCallback } from "react";
import { Tag, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  reward_type: "percent" | "flat";
  reward_value: number;
  max_discount: number | null;
  min_order_amount: number;
  max_total_uses: number | null;
  max_per_phone: number;
  active: boolean;
  expires_at: string | null;
  redemption_count: number;
  total_discounted: number;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    rewardType: "percent" as "percent" | "flat",
    rewardValue: 10,
    maxDiscount: "",
    minOrderAmount: "0",
    maxTotalUses: "",
    maxPerPhone: 1,
    expiresAt: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setCoupons(
        (json.coupons ?? []).map((c: Coupon) => ({
          ...c,
          reward_value: Number(c.reward_value),
          max_discount: c.max_discount != null ? Number(c.max_discount) : null,
          min_order_amount: Number(c.min_order_amount),
          total_discounted: Number(c.total_discounted),
        })),
      );
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          description: formData.description || undefined,
          rewardType: formData.rewardType,
          rewardValue: Number(formData.rewardValue),
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
          minOrderAmount: Number(formData.minOrderAmount),
          maxTotalUses: formData.maxTotalUses ? Number(formData.maxTotalUses) : null,
          maxPerPhone: Number(formData.maxPerPhone),
          expiresAt: formData.expiresAt
            ? new Date(formData.expiresAt).toISOString()
            : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "יצירה נכשלה");
        return;
      }
      setShowCreate(false);
      setFormData({
        code: "",
        description: "",
        rewardType: "percent",
        rewardValue: 10,
        maxDiscount: "",
        minOrderAmount: "0",
        maxTotalUses: "",
        maxPerPhone: 1,
        expiresAt: "",
      });
      await fetchCoupons();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await fetchCoupons();
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-secondary" />
          <h1 className="text-2xl font-bold text-primary">קופונים</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          קוד חדש
        </button>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="text-right p-4 font-medium text-muted">קוד</th>
              <th className="text-right p-4 font-medium text-muted">תיאור</th>
              <th className="text-right p-4 font-medium text-muted">הנחה</th>
              <th className="text-right p-4 font-medium text-muted">מינ' הזמנה</th>
              <th className="text-right p-4 font-medium text-muted">שימושים</th>
              <th className="text-right p-4 font-medium text-muted">תפוגה</th>
              <th className="text-right p-4 font-medium text-muted">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-border/50">
                <td className="p-4 font-mono font-bold" dir="ltr">{c.code}</td>
                <td className="p-4 text-xs text-muted">{c.description ?? "—"}</td>
                <td className="p-4 font-bold">
                  {c.reward_type === "percent" ? `${c.reward_value}%` : `${c.reward_value}₪`}
                  {c.reward_type === "percent" && c.max_discount && (
                    <span className="text-xs text-muted ms-1">(עד {c.max_discount}₪)</span>
                  )}
                </td>
                <td className="p-4 text-xs">{c.min_order_amount}₪</td>
                <td className="p-4 text-xs">
                  {c.redemption_count}
                  {c.max_total_uses && `/${c.max_total_uses}`}
                  <div className="text-xs text-muted">{c.total_discounted}₪ סה&quot;כ</div>
                </td>
                <td className="p-4 text-xs text-muted" dir="ltr">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("he-IL") : "—"}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive(c.id, c.active)}
                    className={`flex items-center gap-1 ${c.active ? "text-green-600" : "text-gray-400"}`}
                  >
                    {c.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    <span className="text-xs">{c.active ? "פעיל" : "מושבת"}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {coupons.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            אין קופונים. צור אחד.
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-primary mb-4">קוד חדש</h2>
            <form onSubmit={createCoupon} className="space-y-3">
              <div>
                <label className="text-xs font-medium">קוד</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="WELCOME10"
                  className="input-field text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-medium">תיאור</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">סוג</label>
                  <select
                    value={formData.rewardType}
                    onChange={(e) =>
                      setFormData({ ...formData, rewardType: e.target.value as "percent" | "flat" })
                    }
                    className="input-field text-sm"
                  >
                    <option value="percent">אחוז</option>
                    <option value="flat">סכום קבוע</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">
                    {formData.rewardType === "percent" ? "אחוז" : "סכום ₪"}
                  </label>
                  <input
                    type="number"
                    value={formData.rewardValue}
                    onChange={(e) => setFormData({ ...formData, rewardValue: Number(e.target.value) })}
                    required
                    className="input-field text-sm"
                  />
                </div>
              </div>
              {formData.rewardType === "percent" && (
                <div>
                  <label className="text-xs font-medium">תקרת הנחה ₪ (אופציונלי)</label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">מינ' הזמנה ₪</label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">לטלפון (0=ללא הגבלה)</label>
                  <input
                    type="number"
                    value={formData.maxPerPhone}
                    onChange={(e) => setFormData({ ...formData, maxPerPhone: Number(e.target.value) })}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">מקס שימושים סה&quot;כ</label>
                  <input
                    type="number"
                    value={formData.maxTotalUses}
                    onChange={(e) => setFormData({ ...formData, maxTotalUses: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">תפוגה</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 text-sm disabled:opacity-50"
                >
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
