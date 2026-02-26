"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation, Phone, Package, MapPin, CheckCircle2, Clock, ArrowLeft } from "lucide-react";

type TaskType = "pickup" | "delivery";
type TaskStatus = "pending" | "in_progress" | "completed";

interface Task {
  id: string;
  orderNumber: string;
  type: TaskType;
  status: TaskStatus;
  address: string;
  contactName: string;
  contactPhone: string;
  packageType: string;
  serviceType: string;
  notes: string | null;
  lat: number;
  lng: number;
}

const mockTasks: Task[] = [
  {
    id: "t1",
    orderNumber: "DEL-A1B2C3-X1",
    type: "pickup",
    status: "in_progress",
    address: "חיפה, רח' הרצל 15",
    contactName: "שרה אברהם",
    contactPhone: "050-7777777",
    packageType: "חבילה קטנה",
    serviceType: "אקספרס",
    notes: "קומה 3, דירה 12",
    lat: 32.818,
    lng: 34.998,
  },
  {
    id: "t2",
    orderNumber: "DEL-A1B2C3-X1",
    type: "delivery",
    status: "pending",
    address: "כרמיאל, רח' הגליל 22",
    contactName: "מירי לוי",
    contactPhone: "050-8888888",
    packageType: "חבילה קטנה",
    serviceType: "אקספרס",
    notes: "להשאיר אצל שכנים אם אין תשובה",
    lat: 32.918,
    lng: 35.296,
  },
  {
    id: "t3",
    orderNumber: "DEL-G7H8I9-Z3",
    type: "pickup",
    status: "pending",
    address: "קריית ביאליק, דרך עכו 45",
    contactName: "נועה גולן",
    contactPhone: "050-9999999",
    packageType: "מסמכים",
    serviceType: "אותו יום",
    notes: null,
    lat: 32.834,
    lng: 35.085,
  },
  {
    id: "t4",
    orderNumber: "DEL-G7H8I9-Z3",
    type: "delivery",
    status: "pending",
    address: "נהריה, רח' הגעתון 12",
    contactName: "אבי דהן",
    contactPhone: "052-1111111",
    packageType: "מסמכים",
    serviceType: "אותו יום",
    notes: "משרד בקומת קרקע",
    lat: 33.004,
    lng: 35.093,
  },
  {
    id: "t5",
    orderNumber: "DEL-M3N4O5-V5",
    type: "pickup",
    status: "pending",
    address: "חיפה, רח' החלוץ 3",
    contactName: "עמית בן דוד",
    contactPhone: "052-2222222",
    packageType: "חבילה",
    serviceType: "יום למחרת",
    notes: null,
    lat: 32.809,
    lng: 34.995,
  },
  {
    id: "t6",
    orderNumber: "DEL-P6Q7R8-U6",
    type: "pickup",
    status: "completed",
    address: "חיפה, רח' ארלוזורוב 44",
    contactName: "דנה כץ",
    contactPhone: "052-3333333",
    packageType: "חבילה קטנה",
    serviceType: "אקספרס",
    notes: null,
    lat: 32.815,
    lng: 34.990,
  },
];

const taskStatusConfig = {
  pending: { label: "ממתין", color: "#F59E0B", bg: "#FEF3C7" },
  in_progress: { label: "בביצוע", color: "#3B82F6", bg: "#DBEAFE" },
  completed: { label: "הושלם", color: "#10B981", bg: "#D1FAE5" },
};

export default function DriverTasksPage() {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const filtered = mockTasks.filter((task) => {
    if (filter === "active") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const activeCount = mockTasks.filter((t) => t.status !== "completed").length;
  const completedCount = mockTasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">המשימות שלי</h1>
        <div className="text-sm text-muted">{activeCount} פעילות</div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "active" as const, label: `פעילות (${activeCount})` },
          { value: "completed" as const, label: `הושלמו (${completedCount})` },
          { value: "all" as const, label: `הכל (${mockTasks.length})` },
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

      {/* Tasks */}
      <div className="space-y-3">
        {filtered.map((task) => {
          const statusConfig = taskStatusConfig[task.status];
          return (
            <div
              key={task.id}
              className={`card !p-0 overflow-hidden ${
                task.status === "in_progress" ? "border-2 border-blue-400" : ""
              } ${task.status === "completed" ? "opacity-60" : ""}`}
            >
              {/* Header */}
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: `${statusConfig.color}10` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusConfig.color }}
                  />
                  <span className="text-sm font-bold" style={{ color: statusConfig.color }}>
                    {task.type === "pickup" ? "איסוף" : "מסירה"}
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted" dir="ltr">#{task.orderNumber}</span>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-primary text-sm">{task.address}</div>
                    {task.notes && (
                      <div className="text-xs text-muted mt-0.5">{task.notes}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center gap-1 text-muted">
                    <span>{task.contactName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted">
                    <Package className="w-3 h-3" />
                    <span>{task.packageType}</span>
                  </div>
                </div>

                {/* Actions */}
                {task.status !== "completed" && (
                  <div className="flex gap-2">
                    <a
                      href={`https://www.waze.com/ul?ll=${task.lat},${task.lng}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      נווט
                    </a>
                    <a
                      href={`tel:${task.contactPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    {task.type === "delivery" ? (
                      <Link
                        href={`/driver/deliver/${task.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        מסירה
                      </Link>
                    ) : (
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary-dark transition-colors">
                        <Package className="w-4 h-4" />
                        אספתי
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין משימות להצגה</p>
          </div>
        )}
      </div>
    </div>
  );
}
