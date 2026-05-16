const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Format period string from start/end dates, including month when available */
export const formatPeriod = (startDate: string, endDate: string, isOngoing: boolean): string => {
  if (!startDate) return "";
  const start = new Date(startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // 0-indexed

  const formatDate = (year: number, month: number) => `${SHORT_MONTHS[month]} ${year}`;

  if (isOngoing) {
    return `${formatDate(startYear, startMonth)} – Present`;
  }

  if (!endDate) return formatDate(startYear, startMonth);
  const end = new Date(endDate);
  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  // Same month+year → show once
  if (startYear === endYear && startMonth === endMonth) {
    return formatDate(startYear, startMonth);
  }

  // Same year, different month → "May – Aug 2025"
  if (startYear === endYear) {
    return `${SHORT_MONTHS[startMonth]} – ${SHORT_MONTHS[endMonth]} ${endYear}`;
  }

  return `${formatDate(startYear, startMonth)} – ${formatDate(endYear, endMonth)}`;
};

/** Parse a date string into month/year components */
export const parseDateString = (dateStr: string | undefined): { month: string; year: string } => {
  if (!dateStr) return { month: "", year: "" };
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { month: "", year: "" };
    return {
      month: String(date.getMonth() + 1).padStart(2, "0"),
      year: String(date.getFullYear()),
    };
  } catch {
    return { month: "", year: "" };
  }
};
/** Get themed CSS classes for form inputs */
export const getInputClass = (theme: "light" | "dark"): string =>
  `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-oceanic-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

/** Get themed CSS classes for form labels */
export const getLabelClass = (theme: "light" | "dark"): string =>
  `block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`;
