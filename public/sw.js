// Habitus service worker: fast loads, offline fallback, server push reminders and notification taps.
// Bundles and assets have a content hash in their path, so a cached copy is always right: cache-first.
// Pages stay network-first, so a new deploy is picked up on the next load; a slow network falls back to the cache.
const CACHE = "habitus-v1";
// Export output only (dev serves /assets/?unstable_path=… without a hash in the name).
const HASHED = /^\/_expo\/static\/|\.[0-9a-f]{32}\.\w+$/;
const PAGE_TIMEOUT_MS = 3000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function store(request, response) {
  // Only whole, successful responses (a video's range request answers 206, which the cache refuses).
  if (response.status === 200) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("range")) return;
  // Dev server bundles (/index.ts.bundle?…) are slow to build and change on every edit: a cached copy would be stale.
  if (url.pathname.endsWith(".bundle")) return;
  if (HASHED.test(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => store(request, response))));
    return;
  }
  const network = fetch(request).then((response) => store(request, response));
  const fallback = async () => (await caches.match(request)) || (await caches.match("/"));
  const slow = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS)).then(fallback);
  event.respondWith(
    // Whichever comes first: the network, or (after the timeout) a cached copy. With no cached copy, keep waiting.
    Promise.race([network, slow.then((hit) => hit || network)]).catch(() => fallback()),
  );
});

// Reminders sent by the server (Supabase function push-send) while the app is closed.
// iOS requires every push to show a notification.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Habitus", {
      body: data.body || "",
      icon: "/icon-192.png",
      tag: data.tag,
      // The same tag replaces the last notice (one per friend); without renotify a second message would arrive silently.
      renotify: !!data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

// Tapping a reminder opens (or focuses) the app on the trick's screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
