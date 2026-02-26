"use client";

import Link from "next/link";
import { Package, Truck, CheckCircle2, Clock, DollarSign, Star, ArrowLeft, Users, ClipboardList } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import { MOCK_DRIVERS, MOCK_ADMIN_ORDERS, DRIVER_STATUS_COLORS, WEEKLY_ORDERS_DATA } from "@/constants/mock-data";
import dynamic from "next/dynamic";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MapView = dynamic(() => import("@/components/shared/MapView"), { ssr: false });

const stats = [
  { label: "הזמנות היום", value: "24", icon: Package, color: "#3B82F6", change: "+12%" },
  { label: "פעילות עכשיו", value: "5", icon: Clock, color: "#F97316", change: "" },
  { label: "הושלמו היום", value: "18", icon: CheckCircle2, color: "#10B981", change: "+8%" },
  { label: "הכנסה היום", value: "₪3,450", icon: DollarSign, color: "#8B5CF6", change: "+15%" },
  { label: "נהגים פעילים", value: "4", icon: Truck, color: "#EC4899", change: "" },
  { label: "דירוג ממוצע", value: "4.8", icon: Star, color: "#F59E0B", change: "" },
];

export default function AdminDashboard() {
  const activeDrivers = MOCK_DRIVERS.filter((d) => d.status !== "offline");
  const mapMarkers = activeDrivers.map((d) => ({
    id: d.id,
    lat: d.lat,
    lng: d.lng,
    label: d.name,
    status: d.status === "available" ? "פנוי" : d.status === "busy" ? "עסוק" : "בהפסקה",
    details: d.vehicle,
    color: DRIVER_STATUS_COLORS[d.status],
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">דשבורד</h1>
          <p className="text-muted text-sm">סקירה כללית של הפעילות</p>
        </div>
        <div className="text-sm text-muted">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card !p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                {stat.change && (
                  <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                )}
              </div>
              <div className="text-xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mini Live Map */}
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-primary flex items-center gap-2">
              <Truck className="w-5 h-5 text-secondary" />
              מפת נהגים חיה
            </h2>
            <Link href="/admin/drivers" className="text-sm text-secondary hover:text-secondary-dark flex items-center gap-1">
              מפה מלאה <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <MapView markers={mapMarkers} height="300px" zoom={9} />
        </div>

        {/* Weekly Chart */}
        <div className="card">
          <h2 className="font-bold text-primary mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-secondary" />
            הזמנות השבוע
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={WEEKLY_ORDERS_DATA}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value, "הזמנות"]}
                labelStyle={{ direction: "rtl" }}
              />
              <Bar dataKey="orders" fill="#F97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-secondary" />
            הזמנות אחרונות
          </h2>
          <Link href="/admin/orders" className="text-sm text-secondary hover:text-secondary-dark flex items-center gap-1">
            כל ההזמנות <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right p-3 font-medium text-muted">מספר</th>
                <th className="text-right p-3 font-medium text-muted">לקוח</th>
                <th className="text-right p-3 font-medium text-muted">יעד</th>
                <th className="text-right p-3 font-medium text-muted">נהג</th>
                <th className="text-right p-3 font-medium text-muted">סטטוס</th>
                <th className="text-right p-3 font-medium text-muted">מחיר</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ADMIN_ORDERS.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs" dir="ltr">{order.order_number}</td>
                  <td className="p-3">{order.customer_name}</td>
                  <td className="p-3 text-muted text-xs max-w-[200px] truncate">{order.delivery_address}</td>
                  <td className="p-3">{order.driver_name || <span className="text-muted">לא שובץ</span>}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${ORDER_STATUS_COLORS[order.status]}15`,
                        color: ORDER_STATUS_COLORS[order.status],
                      }}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{order.estimated_price}₪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
