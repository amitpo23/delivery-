"use client";

import Link from "next/link";
import { Package, PlusCircle, Clock, CheckCircle2, XCircle, ArrowLeft, Truck } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { Order } from "@/types";

// Mock data for demo
const mockOrders: Partial<Order>[] = [
  {
    id: "1",
    order_number: "DEL-ABC123-XYZ",
    status: "in_transit",
    service_type: "express",
    pickup_address: "חיפה, רח' הרצל 15",
    delivery_address: "כרמיאל, רח' הגליל 22",
    estimated_price: 89,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    order_number: "DEL-DEF456-ABC",
    status: "delivered",
    service_type: "next_day",
    pickup_address: "חיפה, רח' מוריה 8",
    delivery_address: "נהריה, רח' הגעתון 5",
    estimated_price: 45,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    delivered_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "3",
    order_number: "DEL-GHI789-DEF",
    status: "pending",
    service_type: "same_day",
    pickup_address: "קריית ביאליק, רח' דרך עכו 45",
    delivery_address: "עכו, העיר העתיקה",
    estimated_price: 55,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const stats = [
  { label: "פעילות", value: 2, icon: Truck, color: "#F97316" },
  { label: "הושלמו", value: 15, icon: CheckCircle2, color: "#10B981" },
  { label: "ממתינות", value: 1, icon: Clock, color: "#F59E0B" },
  { label: "בוטלו", value: 0, icon: XCircle, color: "#EF4444" },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">שלום, אליהב!</h1>
          <p className="text-muted mt-1">ברוך הבא למערכת ההזמנות שלך</p>
        </div>
        <Link href="/booking" className="btn-primary">
          <PlusCircle className="w-5 h-5" />
          הזמנה חדשה
        </Link>
      </div>

      {/* Stats */}
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

      {/* Recent Orders */}
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

        <div className="space-y-4">
          {mockOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ORDER_STATUS_COLORS[order.status!] }}
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
                    backgroundColor: `${ORDER_STATUS_COLORS[order.status!]}15`,
                    color: ORDER_STATUS_COLORS[order.status!],
                  }}
                >
                  {ORDER_STATUS_LABELS[order.status!]}
                </span>
                <span className="text-sm font-bold text-primary">
                  {order.estimated_price}₪
                </span>
                <Link
                  href={`/orders/${order.id}`}
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
