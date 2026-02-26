"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, CheckCircle2, Clock, DollarSign, ArrowLeft, Navigation, Phone } from "lucide-react";

type DriverStatus = "available" | "busy" | "on_break" | "offline";

const statusOptions: { value: DriverStatus; label: string; color: string }[] = [
  { value: "available", label: "פנוי", color: "#10B981" },
  { value: "busy", label: "עסוק", color: "#F97316" },
  { value: "on_break", label: "הפסקה", color: "#F59E0B" },
  { value: "offline", label: "לא מחובר", color: "#6B7280" },
];

const nextTask = {
  id: "t1",
  order_number: "DEL-A1B2C3-X1",
  type: "pickup" as const,
  address: "חיפה, רח' הרצל 15",
  contactName: "שרה אברהם",
  contactPhone: "050-7777777",
  packageType: "חבילה קטנה",
  serviceType: "אקספרס",
  eta: "10 דקות",
};

export default function DriverDashboard() {
  const [status, setStatus] = useState<DriverStatus>("available");

  const todayStats = {
    completed: 8,
    pending: 3,
    earnings: 520,
  };

  return (
    <div className="space-y-6">
      {/* Status Toggle */}
      <div className="card !p-4">
        <div className="text-sm font-medium text-muted mb-3">הסטטוס שלי</div>
        <div className="grid grid-cols-4 gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatus(option.value)}
              className={`py-2.5 px-2 text-sm rounded-xl font-medium transition-all text-center ${
                status === option.value
                  ? "text-white shadow-md"
                  : "bg-gray-100 text-gray-600"
              }`}
              style={status === option.value ? { backgroundColor: option.color } : {}}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-primary">{todayStats.completed}</div>
          <div className="text-xs text-muted">הושלמו</div>
        </div>
        <div className="card !p-4 text-center">
          <Clock className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-primary">{todayStats.pending}</div>
          <div className="text-xs text-muted">ממתינים</div>
        </div>
        <div className="card !p-4 text-center">
          <DollarSign className="w-6 h-6 text-purple-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-primary">{todayStats.earnings}₪</div>
          <div className="text-xs text-muted">רווח</div>
        </div>
      </div>

      {/* Next Task */}
      {status !== "offline" && status !== "on_break" && (
        <div>
          <h2 className="text-lg font-bold text-primary mb-3">המשימה הבאה</h2>
          <div className="card !p-0 overflow-hidden border-2 border-secondary">
            <div className="bg-secondary/10 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-bold text-secondary">
                {nextTask.type === "pickup" ? "איסוף" : "מסירה"}
              </span>
              <span className="text-xs font-mono text-muted" dir="ltr">
                #{nextTask.order_number}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-sm text-muted">כתובת</div>
                <div className="font-bold text-primary">{nextTask.address}</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <div className="text-sm text-muted">איש קשר</div>
                  <div className="text-sm font-medium">{nextTask.contactName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">סוג</div>
                  <div className="text-sm font-medium">{nextTask.packageType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">ETA</div>
                  <div className="text-sm font-bold text-secondary">{nextTask.eta}</div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={`https://www.waze.com/ul?ll=32.794,34.989&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 text-sm !py-2.5"
                >
                  <Navigation className="w-4 h-4" />
                  נווט
                </a>
                <a
                  href={`tel:${nextTask.contactPhone}`}
                  className="btn-secondary flex-1 text-sm !py-2.5"
                >
                  <Phone className="w-4 h-4" />
                  התקשר
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/driver/tasks" className="card !p-4 text-center hover:border-secondary">
          <Package className="w-8 h-8 text-secondary mx-auto mb-2" />
          <div className="text-sm font-bold text-primary">כל המשימות</div>
          <div className="text-xs text-muted">{todayStats.pending + todayStats.completed} היום</div>
        </Link>
        <Link href="/driver/earnings" className="card !p-4 text-center hover:border-secondary">
          <DollarSign className="w-8 h-8 text-secondary mx-auto mb-2" />
          <div className="text-sm font-bold text-primary">הרווחים שלי</div>
          <div className="text-xs text-muted">צפייה בפירוט</div>
        </Link>
      </div>
    </div>
  );
}
