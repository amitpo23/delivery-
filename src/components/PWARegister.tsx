"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once per page load. The SW caches
 * /_next/static and the PWA manifest assets so the app shell loads
 * instantly on repeat visits and from the home-screen icon.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("SW registration failed", err));
  }, []);

  return null;
}
