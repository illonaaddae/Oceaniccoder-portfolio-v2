import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatFullDate,
  formatRelativeTime,
  formatNumber,
  formatFileSize,
  truncateText,
} from "./formatters";

describe("formatters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatDate", () => {
    it("should format a valid date string", () => {
      expect(formatDate("2024-01-15T00:00:00Z")).toMatch(/Jan 1[45], 2024/);
    });

    it("should return '—' for empty inputs", () => {
      expect(formatDate()).toBe("—");
      expect(formatDate(null)).toBe("—");
      expect(formatDate("")).toBe("—");
    });

    it("should return '—' for invalid date strings", () => {
      expect(formatDate("not-a-date")).toBe("—");
    });

    it("should handle error in catch block gracefully", () => {
      const mockDate = new Date("2024-01-15T00:00:00Z");
      vi.spyOn(mockDate, "toLocaleDateString").mockImplementation(() => {
        throw new Error("Formatting error");
      });
      expect(formatDate(mockDate)).toBe("—");
    });
  });

  describe("formatFullDate", () => {
    it("should format a valid date string", () => {
      expect(formatFullDate("2024-01-15T00:00:00Z")).toMatch(/January 1[45], 2024/);
    });
  });

  describe("formatRelativeTime", () => {
    it("should return '—' for empty inputs", () => {
      expect(formatRelativeTime()).toBe("—");
      expect(formatRelativeTime(null)).toBe("—");
      expect(formatRelativeTime("")).toBe("—");
    });

    it("should return '—' for invalid date strings", () => {
      expect(formatRelativeTime("not-a-date")).toBe("—");
    });

    it("should return 'Just now' for very recent times", () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe("Just now");
    });

    it("should format minutes ago", () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 5);
      expect(formatRelativeTime(d.toISOString())).toBe("5 mins ago");
    });

    it("should format 1 min ago", () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 1);
      expect(formatRelativeTime(d.toISOString())).toBe("1 min ago");
    });

    it("should format hours ago", () => {
      const d = new Date();
      d.setHours(d.getHours() - 2);
      expect(formatRelativeTime(d.toISOString())).toBe("2 hours ago");
    });

    it("should format 1 hour ago", () => {
      const d = new Date();
      d.setHours(d.getHours() - 1);
      expect(formatRelativeTime(d.toISOString())).toBe("1 hour ago");
    });

    it("should format days ago", () => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      expect(formatRelativeTime(d.toISOString())).toBe("3 days ago");
    });

    it("should format 1 day ago", () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      expect(formatRelativeTime(d.toISOString())).toBe("1 day ago");
    });

    it("should format weeks ago using formatDate", () => {
      const d = new Date();
      d.setDate(d.getDate() - 10);
      const result = formatRelativeTime(d.toISOString());
      expect(result).not.toBe("—");
      expect(result).not.toContain("ago");
    });

    it("should handle error in catch block gracefully", () => {
      vi.spyOn(global, "Date").mockImplementation(() => {
        throw new Error("Date error");
      });
      expect(formatRelativeTime("2024-01-15T00:00:00Z")).toBe("—");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with commas", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1000000)).toBe("1,000,000");
    });

    it("should return '0' for null or undefined", () => {
      expect(formatNumber()).toBe("0");
      expect(formatNumber(null)).toBe("0");
    });
  });

  describe("formatFileSize", () => {
    it("should format file sizes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });

    it("should return '0 B' for invalid or zero sizes", () => {
      expect(formatFileSize()).toBe("0 B");
      expect(formatFileSize(null)).toBe("0 B");
      expect(formatFileSize(0)).toBe("0 B");
    });
  });

  describe("truncateText", () => {
    it("should truncate text correctly", () => {
      expect(truncateText("hello world", 5)).toBe("hello...");
      expect(truncateText("hello", 10)).toBe("hello");
    });

    it("should return empty string for missing text", () => {
      expect(truncateText()).toBe("");
      expect(truncateText(null)).toBe("");
    });
  });
});
