/**
 * Logging and Monitoring Utility
 *
 * Production-grade logging system that:
 * - Provides structured logging
 * - Integrates with monitoring services (Sentry-ready)
 * - Handles different log levels
 * - Captures performance metrics
 *
 * @module logger
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private maxLogs = 100;

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error?.stack,
    };
  }

  /**
   * Store log entry
   */
  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Store in sessionStorage for debugging
    try {
      sessionStorage.setItem("app_logs", JSON.stringify(this.logs.slice(-50)));
    } catch {
      // Silently fail
    }
  }

  /**
   * Send to monitoring service
   */
  private sendToMonitoring(entry: LogEntry): void {
    // Sentry integration point
    // if (window.Sentry) {
    //   if (entry.level === 'error') {
    //     Sentry.captureException(new Error(entry.message), {
    //       extra: entry.context,
    //     });
    //   } else {
    //     Sentry.addBreadcrumb({
    //       category: 'log',
    //       message: entry.message,
    //       level: entry.level,
    //       data: entry.context,
    //     });
    //   }
    // }
    // LogRocket integration point
    // if (window.LogRocket) {
    //   LogRocket.log(entry.message, entry.context);
    // }
  }

  /**
   * Debug level - development only
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDev) return;

    const entry = this.createEntry("debug", message, context);
    console.debug(`[DEBUG] ${message}`, context || "");
    this.store(entry);
  }

  /**
   * Info level - general information
   */
  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("info", message, context);

    if (this.isDev) {
      console.info(`[INFO] ${message}`, context || "");
    }

    this.store(entry);
    this.sendToMonitoring(entry);
  }

  /**
   * Warn level - potential issues
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("warn", message, context);

    if (this.isDev) {
      console.warn(`[WARN] ${message}`, context || "");
    }

    this.store(entry);
    this.sendToMonitoring(entry);
  }

  /**
   * Error level - errors and exceptions
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry(
      "error",
      message,
      {
        ...context,
        errorMessage: err.message,
      },
      err
    );

    if (this.isDev) {
      console.error(`[ERROR] ${message}`, err, context || "");
    }

    this.store(entry);
    this.sendToMonitoring(entry);
  }

  /**
   * Track performance metric
   */
  trackPerformance(name: string, duration: number): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxLogs) {
      this.metrics.shift();
    }

    if (this.isDev) {
      console.debug(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
    }

    // Send to monitoring
    // if (window.Sentry) {
    //   Sentry.addBreadcrumb({
    //     category: 'performance',
    //     message: name,
    //     data: { duration },
    //   });
    // }
  }

  /**
   * Measure async operation
   */
  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.trackPerformance(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackPerformance(`${name} (failed)`, duration);
      throw error;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
    this.metrics = [];
    try {
      sessionStorage.removeItem("app_logs");
    } catch {
      // Silently fail
    }
  }

  /**
   * Track page view
   */
  trackPageView(path: string): void {
    this.info("Page view", { path, referrer: document.referrer });
  }

  /**
   * Track user action
   */
  trackAction(action: string, details?: Record<string, unknown>): void {
    this.info("User action", { action, ...details });
  }

  /**
   * Track API call
   */
  trackApiCall(
    endpoint: string,
    method: string,
    status: number,
    duration: number
  ): void {
    this.info("API call", { endpoint, method, status, duration });
    this.trackPerformance(`API: ${method} ${endpoint}`, duration);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * React hook for tracking component performance
 */
export const usePerformanceTracking = (componentName: string) => {
  const mountTime = performance.now();

  // Track mount time
  React.useEffect(() => {
    const duration = performance.now() - mountTime;
    logger.trackPerformance(`${componentName} mount`, duration);

    return () => {
      logger.debug(`${componentName} unmounted`);
    };
  }, []);
};

// Need to import React for the hook
import React from "react";

/**
 * Higher-order component for performance tracking
 */
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const WithPerformanceTracking: React.FC<P> = (props) => {
    usePerformanceTracking(displayName);
    return <WrappedComponent {...props} />;
  };

  WithPerformanceTracking.displayName = `WithPerformanceTracking(${displayName})`;

  return WithPerformanceTracking;
};

/**
 * Initialize monitoring services
 * Call this in main.tsx/index.tsx
 */
export const initializeMonitoring = (): void => {
  // Sentry initialization point
  // if (import.meta.env.VITE_SENTRY_DSN) {
  //   Sentry.init({
  //     dsn: import.meta.env.VITE_SENTRY_DSN,
  //     environment: import.meta.env.MODE,
  //     tracesSampleRate: 0.1,
  //   });
  // }

  // Track initial page load
  logger.trackPageView(window.location.pathname);

  // Track Web Vitals
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
            nav.domContentLoadedEventEnd
          );
          logger.trackPerformance("Page Load", nav.loadEventEnd);
        }
      }, 0);
    });
  }

  // Global error handler
  window.addEventListener("error", (event) => {
    logger.error("Uncaught error", event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection", event.reason);
  });

  logger.info("Monitoring initialized");
};
