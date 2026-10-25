// Meat Mall service worker: only what "Add to Home Screen" / install needs.
// No caching - every request still goes to the network as usual.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  // Page navigations only; show a small message instead of the browser error when offline
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response("Интернэт холболтоо шалгана уу. / Please check your connection.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    ),
  );
});

// Web Push: the server sends { title, body, url, tag } (worker/push.ts)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    Promise.all([self.registration.showNotification(data.title || "Meat Mall", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || "/" },
    }), self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      for (const client of windows) client.postMessage({ type: 'MEATMALL_ORDER_UPDATE', tag: data.tag || '' });
    })]),
  );
});

// Tap: focus an open Meat Mall window on that page, or open a new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.navigate(target).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
