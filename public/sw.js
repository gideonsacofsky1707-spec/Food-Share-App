// Bumped to force-clear any previously cached (and possibly now-stale)
// entries on rollout - see the fetch handler below for why that matters.
const CACHE_NAME = "foodshare-static-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Next's build output (_next/static/*) is app CODE, not inert content - in
// dev mode in particular, chunk URLs aren't content-hashed the way a
// production build's are, so the same URL can legitimately serve different
// code across rebuilds. Caching these cache-first (as an earlier version of
// this file did) meant a browser that had ever cached a chunk would keep
// running that exact stale JS on every future visit forever, regardless of
// what the current source actually says - including any bug that's since
// been fixed. Network-first (fall back to cache only when offline) fixes
// that: a fix is picked up on the very next successful load, while still
// giving a previously-visited page something to render when truly offline.
function isAppCode(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

// True static assets (icons, manifest, favicon) are safe to cache-first -
// their filenames are only ever changed deliberately by us, not reused
// across unrelated content the way a dev-mode chunk URL can be.
function isCacheableStatic(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === "/manifest.webmanifest" ||
      /^\/icon-\d+(-maskable)?\.png$/.test(url.pathname) ||
      url.pathname === "/apple-icon.png" ||
      url.pathname === "/favicon.ico")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (isAppCode(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      }),
    );
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }),
    );
  }
});

// Real browser/device push notifications (Web Push API), separate from the
// in-app notification list - this is what lets a request/accept/decline
// event reach the user even when the app/browser is fully closed.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "FoodShare", {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
