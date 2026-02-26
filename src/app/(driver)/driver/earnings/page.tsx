"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Package, Calendar } from "lucide-react";

type Period = "today" | "week" | "month";

const earningsData = {
  today: {
    total: 520,
    deliveries: 8,
    bonus: 50,
    tips: 30,
    breakdown: [
      { id: "1", orderNumber: "DEL-A1B2C3-X1", amount: 65, type: "אקספרס", time: "08:45" },
      { id: "2", orderNumber: "DEL-D4E5F6-Y2", amount: 55, type: "אותו יום", time: "09:30" },
      { id: "3", orderNumber: "DEL-G7H8I9-Z3", amount: 72, type: "אקספרס", time: "10:15" },
      { id: "4", orderNumber: "DEL-J0K1L2-W4", amount: 45, type: "יום למחרת", time: "11:00" },
      { id: "5", orderNumber: "DEL-M3N4O5-V5", amount: 58, type: "אותו יום", time: "12:20" },
      { id: "6", orderNumber: "DEL-P6Q7R8-U6", amount: 65, type: "אקספרס", time: "14:00" },
      { id: "7", orderNumber: "DEL-S9T0U1-T7", amount: 80, type: "אקספרס", time: "15:30" },
      { id: "8", orderNumber: "DEL-V2W3X4-S8", amount: 80, type: "אקספרס", time: "16:45" },
    ],
  },
  week: {
    total: 2800,
    deliveries: 42,
    bonus: 200,
    tips: 150,
    breakdown: [],
  },
  month: {
    total: 11200,
    deliveries: 168,
    bonus: 800,
    tips: 620,
    breakdown: [],
  },
};

export default function DriverEarningsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const data = earningsData[period];

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-4">הרווחים שלי</h1>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: "today" as const, label: "היום" },
          { value: "week" as const, label: "השבוע" },
          { value: "month" as const, label: "החודש" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`flex-1 py-2.5 text-sm rounded-xl font-medium transition-colors ${
              period === tab.value
                ? "bg-primary text-white"
                : "bg-white border border-border text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Total Earnings */}
      <div className="card !p-6 mb-4 bg-gradient-to-l from-primary to-primary-light text-white !border-0">
        <div className="text-sm text-white/60 mb-1">סה&quot;כ רווח</div>
        <div className="text-4xl font-bold">{data.total.toLocaleString()}₪</div>
        <div className="text-sm text-white/60 mt-1">
          {period === "today" ? "היום" : period === "week" ? "השבוע" : "החודש"}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card !p-3 text-center">
          <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{data.deliveries}</div>
          <div className="text-xs text-muted">משלוחים</div>
        </div>
        <div className="card !p-3 text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{data.bonus}₪</div>
          <div className="text-xs text-muted">בונוס</div>
        </div>
        <div className="card !p-3 text-center">
          <DollarSign className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{data.tips}₪</div>
          <div className="text-xs text-muted">טיפים</div>
        </div>
      </div>

      {/* Avg Per Delivery */}
      <div className="card !p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-muted">ממוצע למשלוח</span>
        <span className="text-lg font-bold text-primary">
          {data.deliveries > 0 ? Math.round((data.total - data.bonus - data.tips) / data.deliveries) : 0}₪
        </span>
      </div>

      {/* Today's Breakdown */}
      {period === "today" && data.breakdown.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-secondary" />
            פירוט היום
          </h2>
          <div className="space-y-2">
            {data.breakdown.map((item) => (
              <div key={item.id} className="card !p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium font-mono" dir="ltr">{item.orderNumber}</div>
                    <div className="text-xs text-muted">{item.type} | {item.time}</div>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">+{item.amount}₪</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {period !== "today" && (
        <div className="text-center py-8 text-muted">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">פירוט מפורט זמין רק עבור היום</p>
          <p className="text-xs">לדוח מלא פנו למנהל</p>
        </div>
      )}
    </div>
  );
}
