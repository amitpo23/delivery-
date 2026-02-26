"use client";

import { DollarSign, TrendingUp, Truck, Package, ArrowUp, ArrowDown } from "lucide-react";
import { WEEKLY_ORDERS_DATA, MOCK_ADMIN_ORDERS, MOCK_DRIVERS } from "@/constants/mock-data";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { month: "ספט", revenue: 28500, expenses: 18200 },
  { month: "אוק", revenue: 32100, expenses: 20100 },
  { month: "נוב", revenue: 35400, expenses: 21800 },
  { month: "דצמ", revenue: 41200, expenses: 25300 },
  { month: "ינו", revenue: 38700, expenses: 23900 },
  { month: "פבר", revenue: 44500, expenses: 27100 },
];

const stats = [
  { label: "הכנסה החודש", value: "₪44,500", icon: DollarSign, color: "#10B981", change: "+15%", up: true },
  { label: "הוצאות החודש", value: "₪27,100", icon: TrendingUp, color: "#EF4444", change: "+5%", up: true },
  { label: "רווח נקי", value: "₪17,400", icon: ArrowUp, color: "#3B82F6", change: "+28%", up: true },
  { label: "עמלות נהגים", value: "₪18,200", icon: Truck, color: "#8B5CF6", change: "+12%", up: true },
];

export default function AdminFinancePage() {
  const totalRevenue = WEEKLY_ORDERS_DATA.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">כספים ודוחות</h1>
        <p className="text-muted text-sm">סקירה פיננסית כללית</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? "text-green-600" : "text-red-600"}`}>
                  {stat.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <div className="text-xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="card">
          <h2 className="font-bold text-primary mb-4">הכנסות מול הוצאות (6 חודשים)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`₪${Number(value).toLocaleString()}`, ""]} />
              <Bar dataKey="revenue" name="הכנסות" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="הוצאות" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Revenue */}
        <div className="card">
          <h2 className="font-bold text-primary mb-4">הכנסות השבוע ({totalRevenue.toLocaleString()}₪)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={WEEKLY_ORDERS_DATA}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`₪${Number(value).toLocaleString()}`, "הכנסה"]} />
              <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Earnings Summary */}
      <div className="card">
        <h2 className="font-bold text-primary mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-secondary" />
          עמלות נהגים - השבוע
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right p-3 font-medium text-muted">נהג</th>
                <th className="text-right p-3 font-medium text-muted">משלוחים</th>
                <th className="text-right p-3 font-medium text-muted">הכנסה ברוטו</th>
                <th className="text-right p-3 font-medium text-muted">עמלה (60%)</th>
                <th className="text-right p-3 font-medium text-muted">דירוג</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DRIVERS.filter((d) => d.totalDeliveries > 0).map((driver) => {
                const weeklyEarnings = driver.todayEarnings * 5;
                const commission = Math.round(weeklyEarnings * 0.6);
                return (
                  <tr key={driver.id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="p-3 font-medium">{driver.name}</td>
                    <td className="p-3">{driver.todayDeliveries * 5}</td>
                    <td className="p-3">{weeklyEarnings.toLocaleString()}₪</td>
                    <td className="p-3 font-bold text-green-600">{commission.toLocaleString()}₪</td>
                    <td className="p-3 flex items-center gap-1">
                      {driver.rating}
                      <span className="text-yellow-400">★</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
