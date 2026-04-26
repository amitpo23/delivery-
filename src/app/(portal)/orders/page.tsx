"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Package, ArrowLeft } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";

const mockOrders = [
  {
    id: "1",
    order_number: "DEL-ABC123-XYZ",
    status: "in_transit" as OrderStatus,
    service_type: "express",
    pickup_address: "חיפה, רח' הרצל 15",
    delivery_address: "כרמיאל, רח' הגליל 22",
    estimated_price: 89,
    created_at: "2026-02-26T10:00:00Z",
  },
  {
    id: "2",
    order_number: "DEL-DEF456-ABC",
    status: "delivered" as OrderStatus,
    service_type: "next_day",
    pickup_address: "חיפה, רח' מוריה 8",
    delivery_address: "נהריה, רח' הגעתון 5",
    estimated_price: 45,
    created_at: "2026-02-25T14:30:00Z",
  },
  {
    id: "3",
    order_number: "DEL-GHI789-DEF",
    status: "pending" as OrderStatus,
    service_type: "same_day",
    pickup_address: "קריית ביאליק, רח' דרך עכו 45",
    delivery_address: "עכו, העיר העתיקה",
    estimated_price: 55,
    created_at: "2026-02-26T09:00:00Z",
  },
  {
    id: "4",
    order_number: "DEL-JKL012-GHI",
    status: "delivered" as OrderStatus,
    service_type: "economy",
    pickup_address: "חיפה, רח' החלוץ 3",
    delivery_address: "צפת, רח' ירושלים 12",
    estimated_price: 35,
    created_at: "2026-02-23T08:00:00Z",
  },
  {
    id: "5",
    order_number: "DEL-MNO345-JKL",
    status: "cancelled" as OrderStatus,
    service_type: "express",
    pickup_address: "נשר, רח' הראשונים 7",
    delivery_address: "טבריה, רח' הגליל 18",
    estimated_price: 92,
    created_at: "2026-02-22T16:00:00Z",
  },
];

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "pending", label: "ממתין" },
  { value: "in_transit", label: "בדרך" },
  { value: "delivered", label: "נמסר" },
  { value: "cancelled", label: "בוטל" },
];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = mockOrders.filter((order) => {
    const matchesSearch = !search || order.order_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
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

      {/* Filters */}
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

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">לא נמצאו הזמנות</p>
          </div>
        ) : (
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
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-1 text-sm text-secondary hover:text-secondary-dark"
                  >
                    פרטים
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
