import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface PaginationProps {
  /** 1-based current page. */
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Explicit theme (admin passes this). Omit on public pages to auto-detect. */
  theme?: "light" | "dark";
  /** Size of the numbered window (default 3 → e.g. "1 2 3", arrows to move). */
  maxSlots?: number;
  className?: string;
}

/** Build the windowed list of page slots: numbers and "…" gaps. */
function buildSlots(current: number, total: number, maxSlots: number): (number | "…")[] {
  if (total <= maxSlots) return Array.from({ length: total }, (_, i) => i + 1);

  const slots: (number | "…")[] = [1];
  const side = Math.max(1, Math.floor((maxSlots - 3) / 2));
  let start = Math.max(2, current - side);
  let end = Math.min(total - 1, current + side);

  // Widen the window toward whichever edge has room, keeping a stable count.
  while (end - start < maxSlots - 3) {
    if (start > 2) start--;
    else if (end < total - 1) end++;
    else break;
  }

  if (start > 2) slots.push("…");
  for (let i = start; i <= end; i++) slots.push(i);
  if (end < total - 1) slots.push("…");
  slots.push(total);
  return slots;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalItems,
  pageSize,
  onPageChange,
  theme,
  maxSlots = 3,
  className = "",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const isDark =
    theme === "dark" ||
    (theme === undefined &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const slots = buildSlots(page, totalPages, maxSlots);

  const sub = isDark ? "text-slate-400" : "text-slate-500";
  const ctrl = isDark
    ? "text-slate-300 hover:text-oceanic-400 hover:bg-white/5"
    : "text-slate-600 hover:text-oceanic-600 hover:bg-slate-100";
  const disabled = "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

  const goto = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t ${
        isDark ? "border-white/10" : "border-slate-200"
      } ${className}`}
    >
      <p className={`text-xs sm:text-sm ${sub}`}>
        Showing <span className="font-semibold">{start}</span>–
        <span className="font-semibold">{end}</span> of{" "}
        <span className="font-semibold">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goto(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          title="Previous page"
          className={`p-2 rounded-lg transition-colors ${ctrl} ${disabled}`}
        >
          <FaChevronLeft className="w-3 h-3" />
        </button>

        {slots.map((slot, i) =>
          slot === "…" ? (
            <span key={`gap-${i}`} className={`px-1.5 text-sm ${sub}`}>
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              onClick={() => goto(slot)}
              aria-label={`Page ${slot}`}
              aria-current={slot === page ? "page" : undefined}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                slot === page ? "bg-oceanic-600 text-white" : ctrl
              }`}
            >
              {slot}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => goto(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          title="Next page"
          className={`p-2 rounded-lg transition-colors ${ctrl} ${disabled}`}
        >
          <FaChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
