/**
 * Logger Utility
 * Production-grade logging with Sentry-ready integration
 *
 * @module utils/logger
 */

// ============================================
// Types
// ============================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  sentryDsn?: string;
}

// ============================================
// Configuration
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  minLevel: import.meta.env.PROD ? "warn" : "debug",
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
  remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
};

let config: LoggerConfig = { ...defaultConfig };

// Session ID for tracking user sessions
const sessionId = generateSessionId();

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Core Logger Functions
// ============================================

/**
 * Creates a log entry with metadata
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
    sessionId,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

/**
 * Checks if a log level should be output based on configuration
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Outputs log to console with appropriate styling
 */
function logToConsole(entry: LogEntry): void {
  if (!config.enableConsole) return;

  const styles: Record<LogLevel, string> = {
    debug: "color: #6b7280",
    info: "color: #3b82f6",
    warn: "color: #f59e0b; font-weight: bold",
    error: "color: #ef4444; font-weight: bold",
  };

  const consoleMethod =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
      ? console.warn
      : entry.level === "info"
      ? console.info
      : console.log;

  consoleMethod(
    `%c[${entry.level.toUpperCase()}] ${entry.timestamp}`,
    styles[entry.level],
    entry.message,
    entry.data || ""
  );
}

/**
 * Sends log to remote logging service
 */
async function logToRemote(entry: LogEntry): Promise<void> {
  if (!config.enableRemote || !config.remoteEndpoint) return;

  try {
    await fetch(config.remoteEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
      // Use keepalive for error logs that might occur during page unload
      keepalive: entry.level === "error",
    });
  } catch {
    // Silently fail remote logging to prevent infinite loops
    console.warn("[Logger] Failed to send log to remote service");
  }
}

/**
 * Reports error to Sentry if configured
 */
function reportToSentry(entry: LogEntry): void {
  // Sentry integration placeholder
  // When you add Sentry, initialize it in your app and use:
  // import * as Sentry from "@sentry/react";
  // Sentry.captureException(new Error(entry.message), { extra: entry.data });

  if (
    config.sentryDsn &&
    typeof window !== "undefined" &&
    (window as any).Sentry
  ) {
    const Sentry = (window as any).Sentry;
    if (entry.level === "error") {
      Sentry.captureException(new Error(entry.message), {
        extra: entry.data,
        tags: {
          sessionId: entry.sessionId,
        },
      });
    } else if (entry.level === "warn") {
      Sentry.captureMessage(entry.message, {
        level: "warning",
        extra: entry.data,
      });
    }
  }
}

/**
 * Core log function
 */
function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, message, data);

  logToConsole(entry);

  if (level === "error" || level === "warn") {
    logToRemote(entry);
    reportToSentry(entry);
  }
}

// ============================================
// Public API
// ============================================

export const logger = {
  /**
   * Debug level logging - development only
   */
  debug: (message: string, data?: Record<string, unknown>): void => {
    log("debug", message, data);
  },

  /**
   * Info level logging - general information
   */
  info: (message: string, data?: Record<string, unknown>): void => {
    log("info", message, data);
  },

  /**
   * Warning level logging - potential issues
   */
  warn: (message: string, data?: Record<string, unknown>): void => {
    log("warn", message, data);
  },

  /**
   * Error level logging - errors and exceptions
   */
  error: (message: string, data?: Record<string, unknown>): void => {
    log("error", message, data);
  },

  /**
   * Configure the logger
   */
  configure: (newConfig: Partial<LoggerConfig>): void => {
    config = { ...config, ...newConfig };
  },

  /**
   * Get current session ID
   */
  getSessionId: (): string => sessionId,

  /**
   * Log a performance metric
   */
  performance: (
    metric: string,
    duration: number,
    data?: Record<string, unknown>
  ): void => {
    log("info", `Performance: ${metric}`, { ...data, duration, metric });
  },

  /**
   * Log user action for analytics
   */
  track: (action: string, data?: Record<string, unknown>): void => {
    log("info", `User Action: ${action}`, {
      ...data,
      action,
      type: "analytics",
    });
  },
};

// ============================================
// Global Error Handlers
// ============================================

if (typeof window !== "undefined") {
  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled Promise Rejection", {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
  });

  // Catch global errors
  window.addEventListener("error", (event) => {
    logger.error("Global Error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });
}

export default logger;
