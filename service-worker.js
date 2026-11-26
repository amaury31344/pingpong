"use strict";
const CACHE = "ping-points-static-v23";
const FILES = ["./", "./index.html", "./styles.css", "./app.js", "./suggestions.js", "./share.js", "./profile-photo.js", "./ranking.js", "./competition.js", "./sports.js", "./backup.js", "./cloud-client.bundle.js", "./cloud.js", "./notifications.js", "./directory-core.js", "./directory.js", "./social.js", "./calendar.js", "./practice.js", "./arcade-engine.js", "./arcade.js", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ping-points-static-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const url = new URL(event.request.url);
  if (!FILES.some(file => new URL(file, self.registration.scope).pathname === url.pathname)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request, { ignoreSearch: true })));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const hash = event.notification.data?.hash;
  if (hash !== "amis" && hash !== "seances") return;
  const destination = new URL(`./#${hash}`, self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    const client = clients.find(item => new URL(item.url).origin === self.location.origin);
    if (client) {
      client.postMessage({ type: "ping-notification", hash });
      return client.focus();
    }
    return self.clients.openWindow(destination);
  }));
});
