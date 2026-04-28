"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Play, Square } from "lucide-react";

interface Shift {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes: number | null;
}

export default function ShiftToggle() {
  const [current, setCurrent] = useState<Shift | null>(null);
  const [recent, setRecent] = useState<Shift[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/driver/shifts");
    if (!res.ok) return;
    const json = await res.json();
    setCurrent(json.current);
    setRecent(json.shifts ?? []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-render once a minute while a shift is open so the elapsed counter ticks.
  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [current]);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/driver/shifts/start", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "התחלת משמרת נכשלה");
      }
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    setBusy(true);
    try {
      const res = await fetch("/api/driver/shifts/end", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "סיום משמרת נכשל");
      }
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  const elapsedMin = current
    ? Math.round((Date.now() - new Date(current.started_at).getTime()) / 60_000)
    : 0;

  // Last 7 days totals
  const weekMinutes = recent
    .filter((s) => Date.now() - new Date(s.started_at).getTime() < 7 * 24 * 3600_000)
    .reduce((sum, s) => sum + (s.total_minutes ?? 0), 0);

  return (
    <div className="card !p-3 mb-4" key={tick}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${current ? "text-green-600" : "text-gray-400"}`} />
          <div>
            <div className="text-sm font-medium text-primary">
              {current
                ? `משמרת פעילה — ${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`
                : "משמרת לא פעילה"}
            </div>
            <div className="text-xs text-muted">
              שבוע: {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
            </div>
          </div>
        </div>
        {current ? (
          <button
            onClick={end}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
          >
            <Square className="w-4 h-4" />
            סיים
          </button>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-white hover:bg-secondary-dark disabled:opacity-50 flex items-center gap-1"
          >
            <Play className="w-4 h-4" />
            התחל
          </button>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}
