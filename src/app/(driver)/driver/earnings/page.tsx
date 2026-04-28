"use client";

import { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, Package, Calendar } from "lucide-react";

type Period = "today" | "week" | "month";

interface Earnings {
  period: Period;
  commissionRate: number;
  totals: {
    commission: number;
    bonus: number;
    tip: number;
    penalty: number;
    deliveries: number;
    net: number;
  };
  breakdown: {
    id: string;
    order_number: string;
    service_type: string;
    price: number;
    commission: number;
    delivered_at: string;
  }[];
  bonuses: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
  }[];
}

const SERVICE_LABELS: Record<string, string> = {
  express: "אקספרס",
  same_day: "באותו יום",
  next_day: "יום למחרת",
  economy: "חסכון",
};

const PERIOD_LABELS: Record<Period, string> = {
  today: "היום",
  week: "השבוע",
  month: "החודש",
};

export default function DriverEarningsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/earnings?period=${period}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      setData(await res.json());
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  if (loading && !data) return <div className="text-center py-20 text-muted">טוען...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!data) return null;

  const t = data.totals;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">ההכנסות שלי</h1>
        <div className="flex gap-1">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                period === p ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="card !p-4 mb-4 bg-gradient-to-bl from-primary to-primary-dark text-white">
        <div className="text-xs opacity-80 mb-1">הכנסה נטו {PERIOD_LABELS[period]}</div>
        <div className="text-3xl font-bold mb-2">{t.net.toLocaleString()}₪</div>
        <div className="text-xs opacity-80">
          {t.deliveries} משלוחים | עמלה {Math.round(data.commissionRate * 100)}%
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat icon={DollarSign} label="עמלה" value={t.commission} color="#10B981" />
        <Stat icon={TrendingUp} label="בונוסים" value={t.bonus} color="#F59E0B" />
        <Stat icon={DollarSign} label="טיפים" value={t.tip} color="#3B82F6" />
        <Stat icon={Package} label="משלוחים" value={t.deliveries} color="#8B5CF6" plain />
      </div>

      <div className="card !p-4">
        <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-secondary" />
          פירוט משלוחים
        </h2>

        {data.breakdown.length === 0 ? (
          <div className="text-center py-6 text-muted text-sm">אין משלוחים בתקופה זו</div>
        ) : (
          <div className="space-y-2">
            {data.breakdown.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-xs text-primary" dir="ltr">
                    #{row.order_number}
                  </div>
                  <div className="text-xs text-muted">
                    {SERVICE_LABELS[row.service_type] ?? row.service_type} ·{" "}
                    {new Date(row.delivered_at).toLocaleString("he-IL")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">+{row.commission}₪</div>
                  <div className="text-xs text-muted">מסה&quot;כ {row.price}₪</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.bonuses.length > 0 && (
        <div className="card !p-4 mt-4">
          <h2 className="text-sm font-bold text-primary mb-3">בונוסים וטיפים</h2>
          <div className="space-y-2">
            {data.bonuses.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">{b.description ?? b.type}</div>
                  <div className="text-xs text-muted">
                    {new Date(b.created_at).toLocaleString("he-IL")}
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    b.type === "penalty" ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {b.type === "penalty" ? "" : "+"}
                  {b.amount}₪
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
  plain,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: number;
  color: string;
  plain?: boolean;
}) {
  return (
    <div className="card !p-3 flex items-center gap-2">
      <Icon className="w-5 h-5" style={{ color }} />
      <div>
        <div className="text-base font-bold text-primary">
          {plain ? value : `${value.toLocaleString()}₪`}
        </div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}
