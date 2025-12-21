import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./App";

// Only register service worker in production (not on localhost)
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && !isLocalhost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // SW registered successfully
      })
      .catch((registrationError) => {
        // SW registration failed
      });
  });
} else if ("serviceWorker" in navigator && isLocalhost) {
  // Unregister any existing service workers in development
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      // SW unregistered for development
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
