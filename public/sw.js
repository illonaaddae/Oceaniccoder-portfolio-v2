// Service Worker for Oceaniccoder Portfolio PWA
// Version 5 - Network-first strategy to fix corrupted cache issues
const CACHE_NAME = "oceaniccoder-v5";

// Install event - skip waiting immediately to activate new SW
self.addEventListener("install", (event) => {
  console.log("SW v5: Installing...");
  // Force immediate activation
  self.skipWaiting();
});

// Activate event - DELETE ALL CACHES to fix corrupted content
self.addEventListener("activate", (event) => {
  console.log("SW v5: Activating and clearing ALL caches...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("SW v5: Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log("SW v5: All caches cleared, claiming clients...");
        return self.clients.claim();
      })
  );
});

// Fetch event - NETWORK FIRST to always get fresh content
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip external requests
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Network-first strategy - always try network, fall back to cache only if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // Only use cache as absolute last resort for offline
        return caches.match(event.request);
      })
  );
});

// Listen for messages to force update
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data === "clearCaches") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});
