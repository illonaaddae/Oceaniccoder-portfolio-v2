/**
 * Logger Class
 * @module utils/logger/Logger
 */

import type { LogEntry, LogLevel, PerformanceMetric } from "./types";

export class Logger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private maxLogs = 100;

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error?.stack,
    };
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    try {
      sessionStorage.setItem("app_logs", JSON.stringify(this.logs.slice(-50)));
    } catch {
      /* silent */
    }
  }

  private sendToMonitoring(_entry: LogEntry): void {
    // Sentry / LogRocket integration point
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDev) return;
    const entry = this.createEntry("debug", message, context);
    console.debug(`[DEBUG] ${message}`, context || "");
    this.store(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("info", message, context);
    if (this.isDev) console.info(`[INFO] ${message}`, context || "");
    this.store(entry);
    this.sendToMonitoring(entry);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("warn", message, context);
    if (this.isDev) console.warn(`[WARN] ${message}`, context || "");
    this.store(entry);
    this.sendToMonitoring(entry);
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry(
      "error",
      message,
      { ...context, errorMessage: err.message },
      err,
    );
    if (this.isDev) console.error(`[ERROR] ${message}`, err, context || "");
    this.store(entry);
    this.sendToMonitoring(entry);
  }

  trackPerformance(name: string, duration: number): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
    };
    this.metrics.push(metric);
    if (this.metrics.length > this.maxLogs) this.metrics.shift();
    if (this.isDev) console.debug(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
  }

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      this.trackPerformance(name, performance.now() - start);
      return result;
    } catch (error) {
      this.trackPerformance(`${name} (failed)`, performance.now() - start);
      throw error;
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clear(): void {
    this.logs = [];
    this.metrics = [];
    try {
      sessionStorage.removeItem("app_logs");
    } catch {
      /* silent */
    }
  }

  trackPageView(path: string): void {
    this.info("Page view", { path, referrer: document.referrer });
  }

  trackAction(action: string, details?: Record<string, unknown>): void {
    this.info("User action", { action, ...details });
  }

  trackApiCall(
    endpoint: string,
    method: string,
    status: number,
    duration: number,
  ): void {
    this.info("API call", { endpoint, method, status, duration });
    this.trackPerformance(`API: ${method} ${endpoint}`, duration);
  }
}

export const logger = new Logger();
