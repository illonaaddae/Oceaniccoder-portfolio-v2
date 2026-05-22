/**
 * Formatters Utility Tests
 * @module utils/formatters.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatFullDate,
  formatRelativeTime,
  formatNumber,
  formatFileSize,
  truncateText,
} from "./formatters";

describe("formatDate", () => {
  it("formats a valid ISO date string with default options", () => {
    // 2024-01-15 -> "Jan 15, 2024" (en-US, short month)
    expect(formatDate("2024-01-15T00:00:00Z")).toMatch(/Jan(uary)? 1[45], 2024/);
  });

  it("formats a Date instance", () => {
    const d = new Date("2024-06-01T12:00:00Z");
    expect(formatDate(d)).toMatch(/Jun(e)? 0?1, 2024/);
  });

  it("returns em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(formatDate("")).toBe("—");
  });

  it("returns em-dash for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("respects custom options", () => {
    const result = formatDate("2024-01-15T00:00:00Z", { year: "numeric" });
    expect(result).toBe("2024");
  });

  it("handles leap-year date (Feb 29, 2024)", () => {
    expect(formatDate("2024-02-29T00:00:00Z")).toMatch(/Feb(ruary)? 29, 2024/);
  });
});

describe("formatFullDate", () => {
  it("formats with long month name", () => {
    expect(formatFullDate("2024-01-15T00:00:00Z")).toMatch(/January 1[45], 2024/);
  });

  it("returns em-dash for nullish", () => {
    expect(formatFullDate(null)).toBe("—");
    expect(formatFullDate(undefined)).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for under 60 seconds", () => {
    const t = new Date("2024-06-15T11:59:30Z").toISOString();
    expect(formatRelativeTime(t)).toBe("Just now");
  });

  it("returns minutes ago (singular)", () => {
    const t = new Date("2024-06-15T11:59:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("1 min ago");
  });

  it("returns minutes ago (plural)", () => {
    const t = new Date("2024-06-15T11:55:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("5 mins ago");
  });

  it("returns hours ago (singular)", () => {
    const t = new Date("2024-06-15T11:00:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("1 hour ago");
  });

  it("returns hours ago (plural)", () => {
    const t = new Date("2024-06-15T09:00:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("3 hours ago");
  });

  it("returns days ago (singular)", () => {
    const t = new Date("2024-06-14T12:00:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("1 day ago");
  });

  it("returns days ago (plural)", () => {
    const t = new Date("2024-06-12T12:00:00Z").toISOString();
    expect(formatRelativeTime(t)).toBe("3 days ago");
  });

  it("falls back to formatted date past a week", () => {
    const t = new Date("2024-05-01T12:00:00Z").toISOString();
    expect(formatRelativeTime(t)).toMatch(/May 0?1, 2024/);
  });

  it("returns em-dash for null/undefined/empty", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime(undefined)).toBe("—");
    expect(formatRelativeTime("")).toBe("—");
  });

  it("returns em-dash for invalid date", () => {
    expect(formatRelativeTime("garbage")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats with comma thousands separator", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats small numbers without separators", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-1234)).toBe("-1,234");
  });

  it("returns '0' for null", () => {
    expect(formatNumber(null)).toBe("0");
  });

  it("returns '0' for undefined", () => {
    expect(formatNumber(undefined)).toBe("0");
  });

  it("handles very large numbers", () => {
    expect(formatNumber(1_000_000_000_000)).toBe("1,000,000,000,000");
  });

  it("handles NaN (toLocaleString returns 'NaN')", () => {
    expect(formatNumber(NaN)).toBe("NaN");
  });
});

describe("formatFileSize", () => {
  it("returns '0 B' for 0", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("returns '0 B' for null", () => {
    expect(formatFileSize(null)).toBe("0 B");
  });

  it("returns '0 B' for undefined", () => {
    expect(formatFileSize(undefined)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 ** 3 * 1.2)).toBe("1.2 GB");
  });

  it("formats terabytes for huge values", () => {
    expect(formatFileSize(1024 ** 4 * 3)).toBe("3 TB");
  });
});

describe("truncateText", () => {
  it("returns empty string for null", () => {
    expect(truncateText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(truncateText(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(truncateText("")).toBe("");
  });

  it("returns original when shorter than maxLength", () => {
    expect(truncateText("short text", 100)).toBe("short text");
  });

  it("returns original when equal to maxLength", () => {
    const text = "a".repeat(10);
    expect(truncateText(text, 10)).toBe(text);
  });

  it("truncates with ellipsis when longer", () => {
    const text = "a".repeat(150);
    const result = truncateText(text, 100);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(103);
  });

  it("trims trailing whitespace before ellipsis", () => {
    const text = "hello world this is a test";
    const result = truncateText(text, 6); // "hello " -> trimmed -> "hello..."
    expect(result).toBe("hello...");
  });

  it("uses default maxLength of 100", () => {
    const text = "a".repeat(150);
    const result = truncateText(text);
    expect(result.length).toBe(103);
  });
});
