import React from "react";

export interface FilterPillTab {
  key: string;
  label: string;
  /** Optional count shown as a badge inside the pill. */
  count?: number;
}

interface FilterPillsProps {
  tabs: FilterPillTab[];
  active: string;
  onChange: (key: string) => void;
  theme: "light" | "dark";
  className?: string;
}

/**
 * Shared category/filter pill bar used across the admin dashboard (Skills,
 * Client Work, Invoices, Bookings, Journey, Education). One source of truth so
 * every tab's filter row looks and behaves identically.
 */
export const FilterPills: React.FC<FilterPillsProps> = ({
  tabs,
  active,
  onChange,
  theme,
  className = "",
}) => (
  <div className={`flex flex-wrap gap-2 sm:gap-3 ${className}`}>
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition duration-200 ${
            isActive
              ? theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white shadow-lg shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white shadow-lg shadow-oceanic-500/20"
              : theme === "dark"
                ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                : "bg-white/60 border-slate-300/50 text-slate-700 hover:bg-white/90"
          }`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                isActive
                  ? "bg-white/20 text-white"
                  : theme === "dark"
                    ? "bg-oceanic-500/30 text-oceanic-100"
                    : "bg-blue-400/20 text-blue-700"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
