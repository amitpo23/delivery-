"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Navigation, Phone, Package, MapPin, CheckCircle2 } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import LocationTracker from "@/components/driver/LocationTracker";

interface DriverOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  service_type: string;
  pickup_address: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  package_size: string | null;
  special_instructions: string | null;
  package_description: string | null;
  estimated_price: number;
}

export default function DriverTasksPage() {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) {
      setLoading(false);
      return;
    }
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userResult.user.id)
      .maybeSingle();
    if (!driver) {
      setError("המשתמש שלך לא רשום כנהג. פנה למנהל המערכת.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("orders")
      .select(
        `id, order_number, status, service_type,
         pickup_address, pickup_contact_name, pickup_contact_phone,
         delivery_address, delivery_contact_name, delivery_contact_phone,
         package_size, special_instructions, package_description,
         estimated_price`,
      )
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setOrders((data ?? []) as DriverOrder[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function transition(orderId: string, target: OrderStatus) {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "פעולה נכשלה");
      }
      await fetchOrders();
    } catch {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === "active") return ["assigned", "picked_up", "in_transit"].includes(o.status);
    if (filter === "completed") return ["delivered", "cancelled", "returned"].includes(o.status);
    return true;
  });

  const activeCount = orders.filter((o) =>
    ["assigned", "picked_up", "in_transit"].includes(o.status),
  ).length;
  const completedCount = orders.filter((o) =>
    ["delivered", "cancelled", "returned"].includes(o.status),
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">המשימות שלי</h1>
        <div className="text-sm text-muted">{activeCount} פעילות</div>
      </div>

      <LocationTracker />

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { value: "active" as const, label: `פעילות (${activeCount})` },
          { value: "completed" as const, label: `הושלמו (${completedCount})` },
          { value: "all" as const, label: `הכל (${orders.length})` },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filter === tab.value
                ? "bg-primary text-white"
                : "bg-white border border-border text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <div className="text-center py-12 text-muted">טוען...</div>}

        {!loading && filtered.map((order) => {
          const statusColor = ORDER_STATUS_COLORS[order.status];
          const statusLabel = ORDER_STATUS_LABELS[order.status];
          const phase: "pickup" | "delivery" = order.status === "assigned" ? "pickup" : "delivery";
          const address = phase === "pickup" ? order.pickup_address : order.delivery_address;
          const contactName =
            phase === "pickup" ? order.pickup_contact_name : order.delivery_contact_name;
          const contactPhone =
            phase === "pickup" ? order.pickup_contact_phone : order.delivery_contact_phone;
          const wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
          const isTerminal = ["delivered", "cancelled", "returned"].includes(order.status);
          const busy = busyId === order.id;

          return (
            <div
              key={order.id}
              className={`card !p-0 overflow-hidden ${
                isTerminal ? "opacity-60" : ""
              }`}
            >
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: `${statusColor}10` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  <span className="text-sm font-bold" style={{ color: statusColor }}>
                    {phase === "pickup" ? "איסוף" : "מסירה"}
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted" dir="ltr">#{order.order_number}</span>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-primary text-sm">{address}</div>
                    {phase === "pickup" && order.special_instructions && (
                      <div className="text-xs text-muted mt-0.5">{order.special_instructions}</div>
                    )}
                    {phase === "delivery" && order.package_description && (
                      <div className="text-xs text-muted mt-0.5">{order.package_description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center gap-1 text-muted">
                    <span>{contactName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted">
                    <Package className="w-3 h-3" />
                    <span>{order.package_size ?? "—"}</span>
                  </div>
                </div>

                {!isTerminal && (
                  <div className="flex gap-2">
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      נווט
                    </a>
                    <a
                      href={`tel:${contactPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {order.status === "assigned" && (
                      <button
                        onClick={() => transition(order.id, "picked_up")}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary-dark transition-colors disabled:opacity-50"
                      >
                        <Package className="w-4 h-4" />
                        {busy ? "..." : "אספתי"}
                      </button>
                    )}
                    {order.status === "picked_up" && (
                      <button
                        onClick={() => transition(order.id, "in_transit")}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        <Navigation className="w-4 h-4" />
                        {busy ? "..." : "בדרך"}
                      </button>
                    )}
                    {order.status === "in_transit" && (
                      <Link
                        href={`/driver/deliver/${order.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
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

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין משימות להצגה</p>
          </div>
        )}
      </div>
    </div>
  );
}
