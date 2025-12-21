// Service Worker for Oceaniccoder Portfolio PWA
// Version 4 - Force cache refresh after major updates
const CACHE_NAME = "oceaniccoder-v4";
const IS_LOCALHOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/images/logo/android-chrome-192x192.png",
  "/images/logo/android-chrome-512x512.png",
  "/images/logo/apple-touch-icon.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  // Skip caching entirely in development
  if (IS_LOCALHOST) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log("Cache installation failed:", err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  // COMPLETELY BYPASS SERVICE WORKER IN DEVELOPMENT
  // This prevents all caching issues with Vite dev server
  if (IS_LOCALHOST) {
    return; // Let the browser handle it normally
  }

  // Only cache in production
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Only cache static assets in production
        if (
          event.request.url.includes("/assets/") ||
          event.request.url.includes("/images/")
        ) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      });
    })
  );
});
