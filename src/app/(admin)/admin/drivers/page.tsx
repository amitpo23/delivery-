"use client";

import { useState } from "react";
import { Search, Plus, Phone, Star, MapPin, Truck } from "lucide-react";
import { MOCK_DRIVERS, DRIVER_STATUS_LABELS, DRIVER_STATUS_COLORS } from "@/constants/mock-data";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/shared/MapView"), { ssr: false });

type ViewMode = "map" | "list" | "split";

export default function AdminDriversPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const filtered = MOCK_DRIVERS.filter((driver) => {
    const matchesSearch = !search || driver.name.includes(search) || driver.phone.includes(search);
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const mapMarkers = filtered
    .filter((d) => d.status !== "offline")
    .map((d) => ({
      id: d.id,
      lat: d.lat,
      lng: d.lng,
      label: d.name,
      status: DRIVER_STATUS_LABELS[d.status],
      details: `${d.vehicle} | ${d.todayDeliveries} משלוחים היום`,
      color: DRIVER_STATUS_COLORS[d.status],
    }));

  const statusCounts = {
    all: MOCK_DRIVERS.length,
    available: MOCK_DRIVERS.filter((d) => d.status === "available").length,
    busy: MOCK_DRIVERS.filter((d) => d.status === "busy").length,
    on_break: MOCK_DRIVERS.filter((d) => d.status === "on_break").length,
    offline: MOCK_DRIVERS.filter((d) => d.status === "offline").length,
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">ניהול נהגים</h1>
          <p className="text-muted text-sm">
            {statusCounts.available} פנויים | {statusCounts.busy} עסוקים | {statusCounts.offline} לא מחוברים
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["split", "map", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  viewMode === mode ? "bg-white shadow text-primary font-medium" : "text-gray-500"
                }`}
              >
                {mode === "map" ? "מפה" : mode === "list" ? "רשימה" : "מפוצל"}
              </button>
            ))}
          </div>
          <button className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            הוסף נהג
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "all", label: `הכל (${statusCounts.all})` },
          { value: "available", label: `פנויים (${statusCounts.available})` },
          { value: "busy", label: `עסוקים (${statusCounts.busy})` },
          { value: "on_break", label: `הפסקה (${statusCounts.on_break})` },
          { value: "offline", label: `לא מחוברים (${statusCounts.offline})` },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              statusFilter === filter.value
                ? "bg-primary text-white"
                : "bg-white border border-border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {filter.value !== "all" && (
              <span
                className="inline-block w-2 h-2 rounded-full ml-2"
                style={{ backgroundColor: DRIVER_STATUS_COLORS[filter.value] }}
              />
            )}
            {filter.label}
          </button>
        ))}
      </div>

      <div className={`grid gap-6 ${viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Map */}
        {(viewMode === "map" || viewMode === "split") && (
          <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-bold text-primary flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                מפת נהגים בזמן אמת
              </h2>
            </div>
            <MapView
              markers={mapMarkers}
              height={viewMode === "map" ? "600px" : "500px"}
              zoom={9}
            />
          </div>
        )}

        {/* Driver List */}
        {(viewMode === "list" || viewMode === "split") && (
          <div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש נהג..."
                  className="input-field !pr-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map((driver) => (
                <div key={driver.id} className="card !p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{driver.name}</span>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: `${DRIVER_STATUS_COLORS[driver.status]}15`,
                              color: DRIVER_STATUS_COLORS[driver.status],
                            }}
                          >
                            {DRIVER_STATUS_LABELS[driver.status]}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">{driver.vehicle}</div>
                      </div>
                    </div>
                    <a
                      href={`tel:${driver.phone}`}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{driver.todayDeliveries}</div>
                      <div className="text-xs text-muted">משלוחים היום</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                        {driver.rating}
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="text-xs text-muted">דירוג</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{driver.todayEarnings}₪</div>
                      <div className="text-xs text-muted">רווח היום</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {driver.zone}
                    </span>
                    <span>{driver.totalDeliveries} משלוחים סה&quot;כ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
