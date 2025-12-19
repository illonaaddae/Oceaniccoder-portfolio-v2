/**
 * Utility functions for formatting data throughout the application
 * Centralizes date formatting, relative time, and other common transformations
 */

/**
 * Format a date string to a localized date format
 * @param dateStr - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string or "—" if invalid
 */
export const formatDate = (
  dateStr?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateStr) return "—";
  try {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(
      "en-US",
      options ?? {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  } catch {
    return "—";
  }
};

/**
 * Format a date string to a full date format (e.g., "January 15, 2024")
 */
export const formatFullDate = (dateStr?: string | Date | null): string => {
  return formatDate(dateStr, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format a date string to show relative time (e.g., "2 hours ago")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return "—";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} min${mins > 1 ? "s" : ""} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    return formatDate(dateString);
  } catch {
    return "—";
  }
};

/**
 * Format a number with commas for thousands
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num?: number | null): string => {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("en-US");
};

/**
 * Format file size from bytes to human readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
};

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis or original text
 */
export const truncateText = (
  text?: string | null,
  maxLength: number = 100
): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
};
