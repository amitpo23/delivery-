"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, Package, ArrowLeft } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface PortalOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  service_type: string;
  pickup_address: string;
  delivery_address: string;
  estimated_price: number;
  created_at: string;
}

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "active", label: "פעילות" },
  { value: "delivered", label: "נמסרו" },
  { value: "cancelled", label: "בוטלו" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, service_type, pickup_address, delivery_address, estimated_price, created_at",
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(
          data.map((o) => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status as OrderStatus,
            service_type: o.service_type,
            pickup_address: o.pickup_address,
            delivery_address: o.delivery_address,
            estimated_price: Number(o.estimated_price),
            created_at: o.created_at,
          })),
        );
      }
      setLoading(false);
    })();
  }, []);

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !search || order.order_number.toLowerCase().includes(search.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = ["pending", "confirmed", "assigned", "picked_up", "in_transit"].includes(
        order.status,
      );
    } else if (statusFilter === "delivered") {
      matchesStatus = order.status === "delivered";
    } else if (statusFilter === "cancelled") {
      matchesStatus = ["cancelled", "returned"].includes(order.status);
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-primary">ההזמנות שלי</h1>
        <Link href="/booking" className="btn-primary text-sm">
          <Package className="w-4 h-4" />
          הזמנה חדשה
        </Link>
      </div>

      <div className="card !p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי מספר הזמנה..."
              className="input-field !pr-10"
              dir="ltr"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="w-4 h-4 text-muted" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
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

      <div className="space-y-3">
        {loading && <div className="card text-center py-8 text-muted">טוען...</div>}

        {!loading && filtered.length === 0 && (
          <div className="card text-center py-12">
            <Package className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">לא נמצאו הזמנות</p>
            {orders.length === 0 && (
              <Link href="/booking" className="btn-primary inline-flex mt-4">
                הזמנה ראשונה
              </Link>
            )}
          </div>
        )}

        {!loading &&
          filtered.map((order) => (
            <div key={order.id} className="card !p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-primary text-sm" dir="ltr">
                      #{order.order_number}
                    </span>
                    <span
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${ORDER_STATUS_COLORS[order.status]}15`,
                        color: ORDER_STATUS_COLORS[order.status],
                      }}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="text-sm text-muted">
                    {order.pickup_address} → {order.delivery_address}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {new Date(order.created_at).toLocaleDateString("he-IL")}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-primary">{order.estimated_price}₪</span>
                  <Link
                    href={`/track/${order.order_number}`}
                    className="flex items-center gap-1 text-sm text-secondary hover:text-secondary-dark"
                  >
                    פרטים
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
