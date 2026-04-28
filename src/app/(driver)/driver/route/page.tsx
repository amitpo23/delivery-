"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Navigation, Phone, Package, MapPin, CheckCircle2, Play, Flag } from "lucide-react";

interface Stop {
  id: string;
  sequence: number;
  stop_type: "pickup" | "delivery";
  arrived_at: string | null;
  completed_at: string | null;
  order: {
    id: string;
    order_number: string;
    status: string;
    pickup_address: string;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    delivery_address: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
    delivery_lat: number | null;
    delivery_lng: number | null;
    package_size: string | null;
    special_instructions: string | null;
  };
}

interface ActiveRoute {
  id: string;
  status: "planned" | "in_progress";
  notes: string | null;
  started_at: string | null;
  stops: Stop[];
}

export default function DriverRoutePage() {
  const [route, setRoute] = useState<ActiveRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/routes/active");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setRoute(json.route);
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  async function startRoute() {
    if (!route) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/driver/routes/${route.id}/start`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "התחלת נסיעה נכשלה");
      }
      await fetchRoute();
    } finally {
      setBusy(false);
    }
  }

  async function actStop(stopId: string, action: "arrive" | "complete") {
    if (!route) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/driver/routes/${route.id}/stops/${stopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "פעולה נכשלה");
      }
      await fetchRoute();
    } finally {
      setBusy(false);
    }
  }

  async function completeRoute() {
    if (!route) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/driver/routes/${route.id}/complete`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "סיום נכשל");
      }
      await fetchRoute();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;

  if (!route) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <h1 className="text-xl font-bold text-primary mb-2">אין נסיעה פעילה</h1>
        <p className="text-muted mb-4">המנהל יכול ליצור עבורך נסיעה משותפת עם כמה הזמנות.</p>
        <Link href="/driver/tasks" className="btn-primary inline-flex">
          חזרה למשימות
        </Link>
      </div>
    );
  }

  const allStopsDone = route.stops.every((s) => s.completed_at);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">נסיעה פעילה</h1>
          <p className="text-sm text-muted">
            {route.stops.length} עצירות |{" "}
            {route.stops.filter((s) => s.completed_at).length} הושלמו
          </p>
        </div>
        <Link href="/driver/tasks" className="text-sm text-secondary">
          כל המשימות →
        </Link>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {route.status === "planned" && (
        <button
          onClick={startRoute}
          disabled={busy}
          className="btn-primary w-full text-base !py-3 mb-4 disabled:opacity-50"
        >
          <Play className="w-5 h-5" />
          התחל נסיעה
        </button>
      )}

      <div className="space-y-3">
        {route.stops.map((stop) => {
          const o = stop.order;
          const isPickup = stop.stop_type === "pickup";
          const address = isPickup ? o.pickup_address : o.delivery_address;
          const contactName = isPickup ? o.pickup_contact_name : o.delivery_contact_name;
          const contactPhone = isPickup ? o.pickup_contact_phone : o.delivery_contact_phone;
          const wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
          const isDone = !!stop.completed_at;
          const isArrived = !!stop.arrived_at;
          const canAct = route.status === "in_progress" && !isDone;

          return (
            <div
              key={stop.id}
              className={`card !p-0 overflow-hidden ${
                isDone ? "opacity-60" : ""
              } ${!isDone && isArrived ? "border-2 border-blue-400" : ""}`}
            >
              <div
                className={`px-4 py-2 flex items-center justify-between ${
                  isPickup ? "bg-blue-50" : "bg-orange-50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="px-2 py-0.5 bg-white rounded">#{stop.sequence}</span>
                  <span className={isPickup ? "text-blue-700" : "text-orange-700"}>
                    {isPickup ? "איסוף" : "מסירה"}
                  </span>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
                <span className="text-xs font-mono text-muted" dir="ltr">
                  #{o.order_number}
                </span>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-primary text-sm">{address}</div>
                    {isPickup && o.special_instructions && (
                      <div className="text-xs text-muted mt-0.5">{o.special_instructions}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="text-muted">{contactName}</div>
                  <div className="text-xs text-muted flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {o.package_size ?? "—"}
                  </div>
                </div>

                {canAct && (
                  <div className="flex gap-2">
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white rounded-xl text-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      נווט
                    </a>
                    <a
                      href={`tel:${contactPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 text-gray-700 rounded-xl text-sm"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    {!isArrived && (
                      <button
                        onClick={() => actStop(stop.id, "arrive")}
                        disabled={busy}
                        className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm disabled:opacity-50"
                      >
                        הגעתי
                      </button>
                    )}
                    {isArrived && isPickup && (
                      <button
                        onClick={() => actStop(stop.id, "complete")}
                        disabled={busy}
                        className="flex-1 py-2 bg-secondary text-white rounded-xl text-sm disabled:opacity-50"
                      >
                        אספתי
                      </button>
                    )}
                    {isArrived && !isPickup && (
                      <Link
                        href={`/driver/deliver/${o.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-xl text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        מסירה
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {route.status === "in_progress" && allStopsDone && (
        <button
          onClick={completeRoute}
          disabled={busy}
          className="btn-primary w-full text-base !py-3 mt-4 !bg-green-600 hover:!bg-green-700 disabled:opacity-50"
        >
          <Flag className="w-5 h-5" />
          סיים נסיעה
        </button>
      )}
    </div>
  );
}
