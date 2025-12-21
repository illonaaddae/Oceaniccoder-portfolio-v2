// Service Worker Kill Switch - Version 6
// This SW immediately unregisters itself and clears all caches

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.registration.unregister()
    ])
  );
});

self.addEventListener("fetch", () => {});
