"use client";

import { useEffect, useState, useCallback } from "react";
import { Truck, Package, RefreshCw } from "lucide-react";
import AdminLiveMap from "@/components/admin/AdminLiveMapWrapper";

interface DriverDot {
  id: string;
  name: string;
  phone: string;
  status: string;
  vehicleType: string | null;
  lat: number;
  lng: number;
  lastUpdate: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
}

const REFRESH_INTERVAL_MS = 15_000;

export default function AdminLivePage() {
  const [drivers, setDrivers] = useState<DriverDot[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "שגיאה בטעינה");
        return;
      }
      const json = await res.json();
      setDrivers(json.drivers ?? []);
      setOrders(json.orders ?? []);
      setFetchedAt(json.fetchedAt);
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchLive]);

  const driversWithLocation = drivers.length;
  const ordersOnMap = orders.filter(
    (o) => (o.pickup_lat && o.pickup_lng) || (o.delivery_lat && o.delivery_lng),
  ).length;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">מפה חיה</h1>
          <p className="text-muted text-sm">
            {driversWithLocation} נהגים | {ordersOnMap} הזמנות עם מיקום
            {fetchedAt && (
              <span className="text-xs"> • עודכן {new Date(fetchedAt).toLocaleTimeString("he-IL")}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchLive}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          רענן
        </button>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card !p-3 flex items-center gap-2">
          <Truck className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-lg font-bold text-primary">{driversWithLocation}</div>
            <div className="text-xs text-muted">נהגים פעילים</div>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          <div>
            <div className="text-lg font-bold text-primary">
              {orders.filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status)).length}
            </div>
            <div className="text-xs text-muted">בביצוע</div>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-600" />
          <div>
            <div className="text-lg font-bold text-primary">
              {orders.filter((o) => ["pending", "confirmed"].includes(o.status)).length}
            </div>
            <div className="text-xs text-muted">ממתינות</div>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-lg font-bold text-primary">
              {orders.length - ordersOnMap}
            </div>
            <div className="text-xs text-muted">בלי מיקום</div>
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden" style={{ height: 600 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">טוען מפה...</div>
        ) : (
          <AdminLiveMap drivers={drivers} orders={orders} />
        )}
      </div>
    </div>
  );
}
