/**
 * Monitoring Initialization
 * @module utils/logger/monitoring
 */

import { logger } from "./Logger";

/**
 * Initialize monitoring services
 * Call this in main.tsx/index.tsx
 */
export const initializeMonitoring = (): void => {
  logger.trackPageView(window.location.pathname);

  if ("performance" in window && "getEntriesByType" in performance) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const paintEntries = performance.getEntriesByType("paint");
        paintEntries.forEach((entry) => {
          logger.trackPerformance(entry.name, entry.startTime);
        });

        const navigationEntries = performance.getEntriesByType("navigation");
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0] as PerformanceNavigationTiming;
          logger.trackPerformance(
            "DOM Content Loaded",
            nav.domContentLoadedEventEnd,
          );
          logger.trackPerformance("Page Load", nav.loadEventEnd);
        }
      }, 0);
    });
  }

  window.addEventListener("error", (event) => {
    logger.error("Uncaught error", event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", event.reason);
  });

  logger.info("Monitoring initialized");
};
