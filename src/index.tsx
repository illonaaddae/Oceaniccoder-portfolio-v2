import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./App";

// EMERGENCY FIX: Unregister ALL service workers and clear ALL caches
// This fixes the corrupted cache issue causing blank pages
if ("serviceWorker" in navigator) {
  // Unregister all service workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log("Service worker unregistered");
    });
  });

  // Clear all caches
  if ("caches" in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
        console.log("Cache deleted:", cacheName);
      });
    });
  }
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
