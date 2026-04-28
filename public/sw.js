/* Service worker — minimal offline shell.
 *
 * Strategy:
 *  - Static assets under /_next/static get cache-first (long-lived hashed
 *    filenames mean we never serve stale UI).
 *  - HTML / API requests get network-first with no cache fallback so a
 *    stale order list never overrides the truth.
 *
 * Push notification support is wired up but parked behind a kill switch
 * (no /api/push/subscribe endpoint yet) — once VAPID keys are configured
 * server-side, uncomment the subscription block in client code.
 */

const CACHE_NAME = "elihav-static-v1";
const STATIC_PATTERNS = [/^\/_next\/static\//, /^\/icon-/, /^\/manifest\.json$/];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic = STATIC_PATTERNS.some((p) => p.test(url.pathname));
  if (!isStatic) return; // let HTML/API hit the network as usual

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = (() => {
    try {
      return event.data.json();
    } catch {
      return { title: "התראה חדשה", body: event.data.text() };
    }
  })();
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "אליהב משלוחים", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
