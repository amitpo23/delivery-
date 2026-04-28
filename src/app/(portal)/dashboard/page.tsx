"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, PlusCircle, Clock, CheckCircle2, XCircle, ArrowLeft, Truck } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface DashOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  pickup_address: string;
  delivery_address: string;
  estimated_price: number;
  created_at: string;
}

interface StatCounts {
  active: number;
  delivered: number;
  pending: number;
  cancelled: number;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<DashOrder[]>([]);
  const [counts, setCounts] = useState<StatCounts>({ active: 0, delivered: 0, pending: 0, cancelled: 0 });
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userResult } = await supabase.auth.getUser();
      if (!userResult.user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userResult.user.id)
        .maybeSingle();
      if (profile?.full_name) setName(profile.full_name);

      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, pickup_address, delivery_address, estimated_price, created_at")
        .order("created_at", { ascending: false });

      if (data) {
        const all = data.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status as OrderStatus,
          pickup_address: o.pickup_address,
          delivery_address: o.delivery_address,
          estimated_price: Number(o.estimated_price),
          created_at: o.created_at,
        }));
        setOrders(all.slice(0, 5));
        setCounts({
          active: all.filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status)).length,
          delivered: all.filter((o) => o.status === "delivered").length,
          pending: all.filter((o) => ["pending", "confirmed"].includes(o.status)).length,
          cancelled: all.filter((o) => ["cancelled", "returned"].includes(o.status)).length,
        });
      }
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: "פעילות", value: counts.active, icon: Truck, color: "#F97316" },
    { label: "הושלמו", value: counts.delivered, icon: CheckCircle2, color: "#10B981" },
    { label: "ממתינות", value: counts.pending, icon: Clock, color: "#F59E0B" },
    { label: "בוטלו", value: counts.cancelled, icon: XCircle, color: "#EF4444" },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            שלום{name ? `, ${name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-muted mt-1">ברוך הבא למערכת ההזמנות שלך</p>
        </div>
        <Link href="/booking" className="btn-primary">
          <PlusCircle className="w-5 h-5" />
          הזמנה חדשה
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card !p-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Package className="w-5 h-5 text-secondary" />
            הזמנות אחרונות
          </h2>
          <Link href="/orders" className="text-sm text-secondary hover:text-secondary-dark flex items-center gap-1">
            לכל ההזמנות
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {loading && <div className="text-center py-8 text-muted">טוען...</div>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין הזמנות עדיין</p>
            <Link href="/booking" className="btn-primary inline-flex mt-4">
              הזמנה ראשונה
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ORDER_STATUS_COLORS[order.status] }}
                />
                <div>
                  <div className="font-medium text-primary text-sm" dir="ltr">
                    #{order.order_number}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {order.pickup_address} → {order.delivery_address}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className="px-3 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: `${ORDER_STATUS_COLORS[order.status]}15`,
                    color: ORDER_STATUS_COLORS[order.status],
                  }}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="text-sm font-bold text-primary">
                  {order.estimated_price}₪
                </span>
                <Link
                  href={`/track/${order.order_number}`}
                  className="text-sm text-secondary hover:text-secondary-dark"
                >
                  פרטים
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
