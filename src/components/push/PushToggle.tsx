"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * In-page button that prompts the browser for Notification permission,
 * subscribes via the service worker's pushManager, and POSTs the
 * subscription to /api/push/subscribe. The `phone` prop binds the
 * subscription to a phone (anonymous /track) — when omitted, the
 * subscription attaches to the authenticated user's id.
 *
 * Bails silently when:
 *  - we're SSR / no Notification API
 *  - VAPID public key isn't configured (no push backend yet)
 *  - the user previously denied permission (we don't pester)
 */
export default function PushToggle({ phone }: { phone?: string }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !PUBLIC_KEY) return;
    setSupported(true);
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    })();
  }, []);

  async function subscribe() {
    if (!PUBLIC_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("ההתראות חסומות בדפדפן");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      // Copy the decoded VAPID key into a fresh ArrayBuffer — TS rejects
      // Uint8Array<SharedArrayBuffer> against the BufferSource type.
      const keyBytes = urlBase64ToUint8Array(PUBLIC_KEY);
      const buf = new ArrayBuffer(keyBytes.length);
      new Uint8Array(buf).set(keyBytes);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: buf,
      });
      const payload = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: payload.endpoint,
          p256dh: payload.keys?.p256dh,
          auth: payload.keys?.auth,
          phone,
          userAgent: navigator.userAgent.slice(0, 200),
        }),
      });
      if (!res.ok) {
        await sub.unsubscribe();
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "הרישום נכשל");
        return;
      }
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="card !p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {subscribed ? (
          <Bell className="w-5 h-5 text-green-600" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <div className="text-sm font-medium text-primary">
            {subscribed ? "התראות מופעלות" : "הפעל התראות"}
          </div>
          <div className="text-xs text-muted">
            {subscribed
              ? "תקבל עדכון בכל שינוי סטטוס"
              : "קבל עדכונים בזמן אמת על המשלוח"}
          </div>
        </div>
      </div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
          subscribed
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-secondary text-white hover:bg-secondary-dark"
        } disabled:opacity-50`}
      >
        {loading ? "..." : subscribed ? "כבה" : "הפעל"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
