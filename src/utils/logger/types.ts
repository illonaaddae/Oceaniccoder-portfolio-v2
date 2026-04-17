/**
 * Logger Types
 * @module utils/logger/types
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
}
