"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Filter, UserPlus, Eye, Route as RouteIcon } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";
import { DRIVER_STATUS_COLORS } from "@/constants/mock-data";
import { createClient } from "@/lib/supabase/client";

const statusFilters = [
  { value: "all", label: "הכל" },
  { value: "pending", label: "ממתין" },
  { value: "confirmed", label: "אושר" },
  { value: "assigned", label: "שובץ" },
  { value: "picked_up", label: "נאסף" },
  { value: "in_transit", label: "בדרך" },
  { value: "delivered", label: "נמסר" },
  { value: "cancelled", label: "בוטל" },
];

interface AdminOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  service_type: string;
  pickup_address: string;
  delivery_address: string;
  estimated_price: number;
  created_at: string;
  driver_id: string | null;
  booker_full_name: string | null;
  driver_name: string | null;
}

interface AdminDriver {
  id: string;
  status: string;
  vehicle_type: string | null;
  full_name: string;
  phone: string;
  zone_name: string | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);

  // Multi-select for route creation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeDriverId, setRouteDriverId] = useState<string | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, order_number, status, service_type, pickup_address, delivery_address,
         estimated_price, created_at, driver_id, booker_full_name,
         driver:drivers(profile:profiles!drivers_user_id_fkey(full_name))`,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      setOrders(
        data.map((o) => {
          const driverObj = Array.isArray(o.driver) ? o.driver[0] : o.driver;
          const profileObj = driverObj
            ? Array.isArray(driverObj.profile)
              ? driverObj.profile[0]
              : driverObj.profile
            : null;
          return {
            id: o.id,
            order_number: o.order_number,
            status: o.status as OrderStatus,
            service_type: o.service_type,
            pickup_address: o.pickup_address,
            delivery_address: o.delivery_address,
            estimated_price: Number(o.estimated_price),
            created_at: o.created_at,
            driver_id: o.driver_id,
            booker_full_name: o.booker_full_name,
            driver_name: profileObj?.full_name ?? null,
          };
        }),
      );
    }
    setLoadingOrders(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function openAssignModal(orderId: string) {
    setAssigningOrderId(orderId);
    setShowAssignModal(true);
    setAssignError(null);
    try {
      const res = await fetch("/api/admin/drivers");
      if (!res.ok) {
        setAssignError("שגיאה בטעינת רשימת הנהגים");
        return;
      }
      const json = await res.json();
      type ApiDriver = {
        id: string;
        status: string;
        vehicle_type: string | null;
        profile: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null;
        zone: { name: string } | { name: string }[] | null;
      };
      setDrivers(
        (json.drivers as ApiDriver[]).map((d) => {
          const p = Array.isArray(d.profile) ? d.profile[0] : d.profile;
          const z = Array.isArray(d.zone) ? d.zone[0] : d.zone;
          return {
            id: d.id,
            status: d.status,
            vehicle_type: d.vehicle_type,
            full_name: p?.full_name ?? "—",
            phone: p?.phone ?? "",
            zone_name: z?.name ?? null,
          };
        }),
      );
    } catch {
      setAssignError("שגיאה בטעינת רשימת הנהגים");
    }
  }

  async function handleAssignDriver(driverId: string) {
    if (!assigningOrderId) return;
    setAssignBusy(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/admin/orders/${assigningOrderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setAssignError(
          res.status === 409
            ? "ההזמנה כבר שובצה לנהג אחר. רענן ונסה שוב."
            : json.error || "השיבוץ נכשל",
        );
        if (res.status === 409) await fetchOrders();
        return;
      }
      setShowAssignModal(false);
      setAssigningOrderId(null);
      await fetchOrders();
    } catch {
      setAssignError("שגיאת רשת. נסה שוב.");
    } finally {
      setAssignBusy(false);
    }
  }

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (order.booker_full_name?.includes(search) ?? false);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeCount = orders.filter((o) =>
    ["assigned", "picked_up", "in_transit"].includes(o.status),
  ).length;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">ניהול הזמנות</h1>
          <p className="text-muted text-sm">
            {pendingCount} ממתינות | {activeCount} פעילות | {orders.length} סה&quot;כ
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={async () => {
              setShowRouteModal(true);
              setRouteError(null);
              if (drivers.length === 0) {
                try {
                  const res = await fetch("/api/admin/drivers");
                  if (res.ok) {
                    const json = await res.json();
                    type ApiDriver = {
                      id: string;
                      status: string;
                      vehicle_type: string | null;
                      profile: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null;
                      zone: { name: string } | { name: string }[] | null;
                    };
                    setDrivers(
                      (json.drivers as ApiDriver[]).map((d) => {
                        const p = Array.isArray(d.profile) ? d.profile[0] : d.profile;
                        const z = Array.isArray(d.zone) ? d.zone[0] : d.zone;
                        return {
                          id: d.id,
                          status: d.status,
                          vehicle_type: d.vehicle_type,
                          full_name: p?.full_name ?? "—",
                          phone: p?.phone ?? "",
                          zone_name: z?.name ?? null,
                        };
                      }),
                    );
                  }
                } catch {}
              }
            }}
            className="btn-primary text-sm"
          >
            <RouteIcon className="w-4 h-4" />
            צור נסיעה ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="card !p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי מספר הזמנה, לקוח..."
              className="input-field !pr-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-4 h-4 text-muted shrink-0" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="p-4 w-8"></th>
                <th className="text-right p-4 font-medium text-muted">מספר הזמנה</th>
                <th className="text-right p-4 font-medium text-muted">לקוח</th>
                <th className="text-right p-4 font-medium text-muted">מוצא</th>
                <th className="text-right p-4 font-medium text-muted">יעד</th>
                <th className="text-right p-4 font-medium text-muted">נהג</th>
                <th className="text-right p-4 font-medium text-muted">סטטוס</th>
                <th className="text-right p-4 font-medium text-muted">שירות</th>
                <th className="text-right p-4 font-medium text-muted">מחיר</th>
                <th className="text-right p-4 font-medium text-muted">תאריך</th>
                <th className="text-right p-4 font-medium text-muted">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const canSelect =
                  !order.driver_id &&
                  ["pending", "confirmed"].includes(order.status);
                return (
                <tr
                  key={order.id}
                  className={`border-b border-border/50 hover:bg-gray-50 cursor-pointer ${
                    selectedOrder === order.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    setSelectedOrder(selectedOrder === order.id ? null : order.id)
                  }
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(order.id);
                          else next.delete(order.id);
                          setSelectedIds(next);
                        }}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs font-bold" dir="ltr">
                    {order.order_number}
                  </td>
                  <td className="p-4 font-medium">{order.booker_full_name ?? "—"}</td>
                  <td className="p-4 text-xs text-muted max-w-[150px] truncate">
                    {order.pickup_address}
                  </td>
                  <td className="p-4 text-xs text-muted max-w-[150px] truncate">
                    {order.delivery_address}
                  </td>
                  <td className="p-4">
                    {order.driver_name ? (
                      <span className="text-sm">{order.driver_name}</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(order.id);
                        }}
                        className="flex items-center gap-1 text-xs text-secondary hover:text-secondary-dark font-medium"
                      >
                        <UserPlus className="w-3 h-3" />
                        שבץ נהג
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                      style={{
                        backgroundColor: `${ORDER_STATUS_COLORS[order.status]}15`,
                        color: ORDER_STATUS_COLORS[order.status],
                      }}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted capitalize">
                    {order.service_type.replace("_", " ")}
                  </td>
                  <td className="p-4 font-bold">{order.estimated_price}₪</td>
                  <td className="p-4 text-xs text-muted" dir="ltr">
                    {new Date(order.created_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="p-4">
                    <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loadingOrders && filtered.length === 0 && (
          <div className="text-center py-12 text-muted">לא נמצאו הזמנות</div>
        )}
        {loadingOrders && (
          <div className="text-center py-12 text-muted">טוען...</div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-primary mb-4">שיבוץ נהג</h2>
            <p className="text-sm text-muted mb-4">
              בחרו נהג להזמנה #{orders.find((o) => o.id === assigningOrderId)?.order_number}
            </p>

            {assignError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-3">
                {assignError}
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => handleAssignDriver(driver.id)}
                  disabled={assignBusy}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-secondary hover:bg-secondary/5 transition-colors text-right disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                    />
                    <div>
                      <div className="font-medium text-sm">{driver.full_name}</div>
                      <div className="text-xs text-muted">
                        {driver.vehicle_type ?? "—"} | {driver.zone_name ?? "—"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {drivers.length === 0 && !assignError && (
                <div className="text-center text-muted text-sm py-6">טוען נהגים זמינים...</div>
              )}
            </div>

            <button
              onClick={() => setShowAssignModal(false)}
              disabled={assignBusy}
              className="btn-secondary w-full mt-4 disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRouteModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold text-primary mb-2">צור נסיעה משותפת</h2>
            <p className="text-xs text-muted mb-4">
              {selectedIds.size} הזמנות יקובצו לנסיעה אחת. הסדר: כל האיסופים → כל המסירות.
              ניתן לעדכן ידנית את הסדר אחרי היצירה.
            </p>

            {routeError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-3">
                {routeError}
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">בחר נהג</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setRouteDriverId(driver.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-right ${
                      routeDriverId === driver.id
                        ? "border-secondary bg-secondary/5"
                        : "border-border hover:border-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: DRIVER_STATUS_COLORS[driver.status] }}
                      />
                      <div>
                        <div className="font-medium text-sm">{driver.full_name}</div>
                        <div className="text-xs text-muted">
                          {driver.vehicle_type ?? "—"} | {driver.zone_name ?? "—"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {drivers.length === 0 && (
                  <div className="text-center text-muted text-sm py-4">טוען נהגים זמינים...</div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!routeDriverId) {
                    setRouteError("בחר נהג קודם");
                    return;
                  }
                  setRouteBusy(true);
                  setRouteError(null);
                  try {
                    // Default ordering: all pickups (in selection order),
                    // then all deliveries.
                    const ids = Array.from(selectedIds);
                    const stops = [
                      ...ids.map((orderId) => ({ orderId, stopType: "pickup" as const })),
                      ...ids.map((orderId) => ({ orderId, stopType: "delivery" as const })),
                    ];
                    const res = await fetch("/api/admin/routes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ driverId: routeDriverId, stops }),
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      setRouteError(j.error ?? "יצירת הנסיעה נכשלה");
                      return;
                    }
                    setShowRouteModal(false);
                    setSelectedIds(new Set());
                    setRouteDriverId(null);
                    await fetchOrders();
                  } finally {
                    setRouteBusy(false);
                  }
                }}
                disabled={routeBusy || !routeDriverId}
                className="btn-primary flex-1 text-sm disabled:opacity-50"
              >
                {routeBusy ? "יוצר..." : "צור"}
              </button>
              <button
                onClick={() => setShowRouteModal(false)}
                disabled={routeBusy}
                className="btn-secondary text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
