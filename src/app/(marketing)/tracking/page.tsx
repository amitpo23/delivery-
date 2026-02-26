"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle2, Clock, MapPin } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";

type TrackingStatus = {
  status: string;
  label: string;
  time: string;
  description: string;
  active: boolean;
  completed: boolean;
};

const mockTracking: TrackingStatus[] = [
  {
    status: "pending",
    label: "הזמנה התקבלה",
    time: "10:00",
    description: "ההזמנה התקבלה ונמצאת בטיפול",
    active: false,
    completed: true,
  },
  {
    status: "assigned",
    label: "שליח מוקצה",
    time: "10:15",
    description: "השליח יוסי כ. מוקצה למשלוח שלך",
    active: false,
    completed: true,
  },
  {
    status: "picked_up",
    label: "נאסף",
    time: "10:32",
    description: "החבילה נאספה מכתובת האיסוף",
    active: false,
    completed: true,
  },
  {
    status: "in_transit",
    label: "בדרך אליך",
    time: "10:45",
    description: "השליח בדרך ליעד. זמן הגעה משוער: 20 דקות",
    active: true,
    completed: false,
  },
  {
    status: "delivered",
    label: "נמסר",
    time: "",
    description: "",
    active: false,
    completed: false,
  },
];

export default function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [tracking, setTracking] = useState<TrackingStatus[] | null>(null);
  const [error, setError] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError("יש להזין מספר הזמנה");
      return;
    }
    setError("");
    // Mock: show demo tracking
    setTracking(mockTracking);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container-custom">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">מעקב משלוח</h1>
          <p className="text-white/70 text-lg max-w-xl">
            הזינו את מספר ההזמנה ועקבו אחרי המשלוח שלכם בזמן אמת
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="py-16 md:py-24">
        <div className="container-custom max-w-2xl">
          <form onSubmit={handleSearch} className="card !p-8">
            <label className="block text-lg font-bold text-primary mb-4">
              מספר הזמנה
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="לדוגמא: DEL-ABC123-XYZ"
                  className="input-field !pr-11 text-lg"
                  dir="ltr"
                />
              </div>
              <button type="submit" className="btn-primary !px-8">
                חפש
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>

          {/* Tracking Timeline */}
          {tracking && (
            <div className="card !p-8 mt-8">
              <div className="flex items-center gap-2 mb-6">
                <Package className="w-6 h-6 text-secondary" />
                <h2 className="text-xl font-bold text-primary">
                  משלוח #{orderNumber || "DEL-DEMO-001"}
                </h2>
              </div>

              <div className="relative">
                {tracking.map((step, index) => (
                  <div key={step.status} className="flex gap-4 mb-6 last:mb-0">
                    {/* Timeline Dot & Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          step.completed
                            ? "bg-accent text-white"
                            : step.active
                            ? "bg-secondary text-white animate-pulse"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : step.active ? (
                          <Truck className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      {index < tracking.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-[2rem] ${
                            step.completed ? "bg-accent" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-2">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-bold ${
                            step.active
                              ? "text-secondary"
                              : step.completed
                              ? "text-primary"
                              : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </h3>
                        {step.time && (
                          <span className="text-sm text-muted">{step.time}</span>
                        )}
                      </div>
                      {step.description && (
                        <p className="text-sm text-muted mt-1">{step.description}</p>
                      )}
                      {step.active && (
                        <div className="mt-3 p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                          <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                            <MapPin className="w-4 h-4" />
                            השליח בדרך - ETA: 20 דקות
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
