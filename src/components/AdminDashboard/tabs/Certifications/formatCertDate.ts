/**
 * Formats a certification date string.
 * Handles year-only ("2025"), "Month Year" ("December 2024"), or full Date parsing.
 */
export const formatCertDate = (dateStr: string): string => {
  if (!dateStr) return "N/A";

  // Check if it's just a year (e.g., "2025", "2024")
  if (/^\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }

  // Check if it's "Month Year" format (e.g., "December 2024")
  const monthYearMatch = dateStr.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i
  );
  if (monthYearMatch) {
    return `${monthYearMatch[1]} ${monthYearMatch[2]}`;
  }

  // Try parsing as a full date
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    }
  } catch {
    // If parsing fails, return the original string
  }

  return dateStr;
};
