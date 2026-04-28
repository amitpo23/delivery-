"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  Star,
  Users,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

interface Analytics {
  range: { since: string; days: number };
  counts: { total: number; delivered: number; cancelled: number; pending: number; active: number };
  revenue: { total: number; avg_ticket: number };
  on_time_rate: number;
  series: { day: string; orders: number; revenue: number }[];
  by_service: Record<string, number>;
  top_zones: { zone: string; count: number }[];
  drivers: {
    total: number;
    online: number;
    leaderboard: { id: string; name: string; status: string; deliveries: number; rating: number | null }[];
  };
  tickets: { open: number; in_progress: number; urgent: number };
}

const SERVICE_LABELS: Record<string, string> = {
  express: "אקספרס",
  same_day: "באותו יום",
  next_day: "יום למחרת",
  economy: "חסכון",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "טעינה נכשלה");
          return;
        }
        setData(await res.json());
      } catch {
        setError("שגיאת רשת");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;
  if (error || !data) return <div className="text-center py-20 text-red-600">{error}</div>;

  const maxOrders = Math.max(...data.series.map((s) => s.orders), 1);
  const maxRevenue = Math.max(...data.series.map((s) => s.revenue), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">דשבורד</h1>
        <p className="text-muted text-sm">{data.range.days} ימים אחרונים</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Package} label="הזמנות" value={data.counts.total.toString()} color="#3B82F6" />
        <Kpi
          icon={DollarSign}
          label="הכנסה"
          value={`${data.revenue.total.toLocaleString()}₪`}
          sub={`ממוצע ${data.revenue.avg_ticket}₪`}
          color="#10B981"
        />
        <Kpi
          icon={CheckCircle2}
          label="On-time"
          value={`${data.on_time_rate}%`}
          color="#F59E0B"
        />
        <Kpi
          icon={AlertCircle}
          label="פניות פתוחות"
          value={(data.tickets.open + data.tickets.in_progress).toString()}
          sub={data.tickets.urgent ? `${data.tickets.urgent} דחופות` : undefined}
          color={data.tickets.urgent ? "#DC2626" : "#6B7280"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Clock} label="ממתינות" value={data.counts.pending.toString()} color="#F59E0B" small />
        <Kpi icon={Truck} label="פעילות" value={data.counts.active.toString()} color="#F97316" small />
        <Kpi icon={CheckCircle2} label="נמסרו" value={data.counts.delivered.toString()} color="#10B981" small />
        <Kpi icon={Users} label="נהגים מחוברים" value={`${data.drivers.online}/${data.drivers.total}`} color="#8B5CF6" small />
      </div>

      {/* Time series */}
      <div className="card !p-4 mb-6">
        <h2 className="text-sm font-bold text-primary mb-3">הזמנות וההכנסה לאורך 30 ימים</h2>
        <div className="space-y-1">
          {data.series.map((day) => (
            <div key={day.day} className="flex items-center gap-2 text-xs">
              <div className="w-16 text-muted shrink-0" dir="ltr">
                {day.day.slice(5)}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 h-4 rounded" style={{ width: `${(day.orders / maxOrders) * 100}%` }} />
                  <span className="text-muted">{day.orders}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="bg-green-100 h-4 rounded"
                    style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                  />
                  <span className="text-muted">{day.revenue}₪</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 pt-3 border-t border-border">
          <span>
            <span className="inline-block w-3 h-3 bg-blue-100 rounded ms-1"></span>הזמנות
          </span>
          <span>
            <span className="inline-block w-3 h-3 bg-green-100 rounded ms-1"></span>הכנסה
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Service split */}
        <div className="card !p-4">
          <h2 className="text-sm font-bold text-primary mb-3">פילוח לפי סוג שירות</h2>
          {Object.keys(data.by_service).length === 0 ? (
            <div className="text-center py-6 text-muted text-sm">אין נתונים</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.by_service).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span>{SERVICE_LABELS[k] ?? k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top zones */}
        <div className="card !p-4">
          <h2 className="text-sm font-bold text-primary mb-3">יעדים מובילים</h2>
          {data.top_zones.length === 0 ? (
            <div className="text-center py-6 text-muted text-sm">אין נתונים</div>
          ) : (
            <div className="space-y-2">
              {data.top_zones.map((z) => (
                <div key={z.zone} className="flex items-center justify-between text-sm">
                  <span>{z.zone}</span>
                  <span className="font-bold">{z.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Driver leaderboard */}
      <div className="card !p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">לוח מובילי נהגים</h2>
          <Link href="/admin/drivers" className="text-xs text-secondary hover:text-secondary-dark">
            כל הנהגים →
          </Link>
        </div>
        {data.drivers.leaderboard.length === 0 ? (
          <div className="text-center py-6 text-muted text-sm">אין נתונים</div>
        ) : (
          <div className="space-y-2">
            {data.drivers.leaderboard.map((d, idx) => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted w-6">#{idx + 1}</span>
                  <span className="font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span>{d.deliveries} משלוחים</span>
                  {d.rating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {d.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink href="/admin/orders" icon={ClipboardList} label="הזמנות" />
        <QuickLink href="/admin/tickets" icon={AlertCircle} label="פניות" />
        <QuickLink href="/admin/customers" icon={Users} label="לקוחות" />
        <QuickLink href="/admin/live" icon={Truck} label="מפה חיה" />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  color,
  small,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className={`card flex items-center gap-3 ${small ? "!p-2" : "!p-4"}`}>
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 ${
          small ? "w-9 h-9" : "w-12 h-12"
        }`}
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className={small ? "w-4 h-4" : "w-6 h-6"} style={{ color }} />
      </div>
      <div>
        <div className={`font-bold text-primary ${small ? "text-base" : "text-2xl"}`}>{value}</div>
        <div className="text-xs text-muted">{label}</div>
        {sub && <div className="text-[10px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card !p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
    >
      <Icon className="w-5 h-5 text-secondary" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
