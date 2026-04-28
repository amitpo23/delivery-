"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings, Save, Info } from "lucide-react";

interface Zone {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  price_per_km: number;
  multiplier: number;
}

interface PricingRule {
  id: string;
  service_type: string;
  urgency_multiplier: number;
}

const SERVICE_LABELS: Record<string, string> = {
  express: "אקספרס",
  same_day: "באותו יום",
  next_day: "יום למחרת",
  economy: "חסכון",
};

export default function SettingsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setZones(
        (json.zones ?? []).map((z: Zone) => ({
          ...z,
          base_price: Number(z.base_price),
          price_per_km: Number(z.price_per_km),
          multiplier: Number(z.multiplier),
        })),
      );
      setRules(
        (json.pricing_rules ?? []).map((r: PricingRule) => ({
          ...r,
          urgency_multiplier: Number(r.urgency_multiplier),
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
    fetchData();
  }, [fetchData]);

  function updateZone(id: string, patch: Partial<Zone>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }
  function updateRule(id: string, patch: Partial<PricingRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map((z) => ({
            id: z.id,
            base_price: z.base_price,
            price_per_km: z.price_per_km,
            multiplier: z.multiplier,
          })),
          pricing_rules: rules.map((r) => ({
            id: r.id,
            urgency_multiplier: r.urgency_multiplier,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "שמירה נכשלה");
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-secondary" />
        <h1 className="text-2xl font-bold text-primary">הגדרות תמחור</h1>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card !p-3 mb-4 bg-amber-50 border-amber-200 flex gap-2">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          הגדרות אלו נשמרות לטבלת ה-DB. מנוע התמחור בייצור עדיין קורא מקבועים ב-
          <code className="font-mono">src/lib/pricing/zones.ts</code>. השינויים ישמשו לדוחות וגרסה עתידית
          של המנוע. עריכה כאן נכתבת ל-audit log.
        </div>
      </div>

      <div className="card !p-4 mb-4">
        <h2 className="text-sm font-bold text-primary mb-3">אזורים</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs">
                <th className="text-right p-2">שם</th>
                <th className="text-right p-2">מחיר בסיס</th>
                <th className="text-right p-2">₪/ק&quot;מ</th>
                <th className="text-right p-2">multiplier</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-t border-border">
                  <td className="p-2 font-medium">{z.name}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.5"
                      value={z.base_price}
                      onChange={(e) => updateZone(z.id, { base_price: Number(e.target.value) })}
                      className="input-field !py-1 w-24 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={z.price_per_km}
                      onChange={(e) => updateZone(z.id, { price_per_km: Number(e.target.value) })}
                      className="input-field !py-1 w-24 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.05"
                      value={z.multiplier}
                      onChange={(e) => updateZone(z.id, { multiplier: Number(e.target.value) })}
                      className="input-field !py-1 w-24 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card !p-4 mb-4">
        <h2 className="text-sm font-bold text-primary mb-3">מכפילי דחיפות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium">{SERVICE_LABELS[r.service_type] ?? r.service_type}</span>
              <input
                type="number"
                step="0.05"
                value={r.urgency_multiplier}
                onChange={(e) => updateRule(r.id, { urgency_multiplier: Number(e.target.value) })}
                className="input-field !py-1 w-24 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
        <Save className="w-4 h-4" />
        {saving ? "שומר..." : savedFlash ? "נשמר!" : "שמור שינויים"}
      </button>
    </div>
  );
}
