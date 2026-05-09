/** Format period string from start/end dates */
export const formatPeriod = (
  startDate: string,
  endDate: string,
  isOngoing: boolean,
): string => {
  if (!startDate) return "";
  const start = new Date(startDate);
  const startYear = start.getFullYear();

  if (isOngoing) {
    return `${startYear} - Present`;
  }

  if (!endDate) return String(startYear);
  const end = new Date(endDate);
  const endYear = end.getFullYear();

  return `${startYear} - ${endYear}`;
};

/** Parse a date string into month/year components */
export const parseDateString = (
  dateStr: string | undefined,
): { month: string; year: string } => {
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
  `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;
