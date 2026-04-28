"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";

const STORAGE_KEY = "driver:tracking-enabled";
const MIN_INTERVAL_MS = 30_000;

/**
 * Driver-side GPS streamer. Uses navigator.geolocation.watchPosition and
 * pushes a sample to /api/driver/locations at most every MIN_INTERVAL_MS,
 * so we don't spam the DB on a phone that's getting GPS readings 5×/sec.
 *
 * The on/off toggle is persisted in localStorage so a driver who enabled
 * tracking before a route doesn't lose state when the page reloads. We do
 * NOT auto-start without an explicit user click — geolocation prompt is
 * privacy-sensitive and a click guarantees the gesture is genuine.
 */
export default function LocationTracker() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPushedAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");

    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("הדפדפן לא תומך באיתור מיקום");
      setEnabled(false);
      return;
    }

    setError(null);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPushedAtRef.current < MIN_INTERVAL_MS) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        lastPushedAtRef.current = now;
        try {
          const res = await fetch("/api/driver/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed ?? undefined,
              heading: pos.coords.heading ?? undefined,
            }),
          });
          if (res.ok) {
            setLastSentAt(now);
          } else if (res.status === 404) {
            // The user is not registered as a driver — turn tracking off so we
            // don't keep retrying every 30s and spamming a permanent error.
            setError("המשתמש שלך לא רשום כנהג. פנה למנהל המערכת.");
            setEnabled(false);
          } else {
            setError("שליחת מיקום נכשלה");
          }
        } catch {
          setError("שגיאת רשת בעת שליחת מיקום");
        } finally {
          inFlightRef.current = false;
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "הרשאת מיקום נדחתה — אפשר את ההרשאה בדפדפן"
            : "שגיאה בקבלת מיקום",
        );
        setEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]);

  return (
    <div className="card !p-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {enabled ? (
            <MapPin className="w-5 h-5 text-green-600" />
          ) : (
            <MapPinOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <div className="text-sm font-medium text-primary">
              {enabled ? "מעקב מיקום פעיל" : "מעקב מיקום מושבת"}
            </div>
            <div className="text-xs text-muted">
              {enabled && lastSentAt
                ? `עודכן לפני ${Math.round((Date.now() - lastSentAt) / 1000)} ש'`
                : enabled
                  ? "ממתין למיקום ראשון..."
                  : "הפעל כדי שהמנהל יראה אותך על המפה"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            enabled
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-secondary text-white hover:bg-secondary-dark"
          }`}
        >
          {enabled ? "הפסק" : "הפעל"}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}
