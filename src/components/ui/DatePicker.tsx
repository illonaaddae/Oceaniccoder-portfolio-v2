import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaRegCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface DatePickerProps {
  /** ISO date string "YYYY-MM-DD" or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PANEL_W = 288; // 18rem
const PANEL_H = 336; // approx, for flip calc

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Parse "YYYY-MM-DD" into parts without timezone drift.
const parseISO = (s: string): { y: number; m: number; d: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
};

/**
 * Design-system date picker — a themed replacement for `<input type="date">`,
 * whose calendar popup is an unstyled OS surface. Emits/consumes an ISO
 * "YYYY-MM-DD" string so it's a drop-in for the native date input's value.
 *
 * The calendar renders in a portal with fixed positioning that clamps/flips to
 * stay on-screen, so it is never clipped by a scrolling/overflow container
 * (e.g. a modal body) and works on small screens.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  theme,
  placeholder = "Select date",
  ariaLabel,
  className = "",
}) => {
  const dark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseISO(value), [value]);
  const today = new Date();

  const [view, setView] = useState(() =>
    parsed ? { y: parsed.y, m: parsed.m } : { y: today.getFullYear(), m: today.getMonth() },
  );

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(PANEL_W, window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    // Flip above the trigger if it would overflow the bottom and there's room.
    if (top + PANEL_H > window.innerHeight - 8 && r.top - PANEL_H - 6 > 8) {
      top = r.top - PANEL_H - 6;
    }
    setCoords({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    if (parsed) setView({ y: parsed.y, m: parsed.m });
    reposition();
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const display = parsed ? `${MONTHS_SHORT[parsed.m]} ${parsed.d}, ${parsed.y}` : "";

  const triggerClass = `w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 text-sm ${
    dark
      ? "bg-gray-800/80 border-gray-700 text-white focus:border-oceanic-500/60"
      : "bg-white border-oceanic-500/20 text-slate-900"
  }`;

  const navBtn = `p-2 rounded-lg transition ${
    dark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
  }`;

  const isToday = (d: number) =>
    d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
  const isSelected = (d: number) =>
    !!parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === d;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={display ? "" : dark ? "text-gray-500" : "text-slate-500"}>
          {display || placeholder}
        </span>
        <FaRegCalendarAlt className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`} />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className={`z-[70] rounded-xl border shadow-2xl p-3 ${
              dark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className={navBtn}
                aria-label="Previous month"
              >
                <FaChevronLeft className="text-xs" />
              </button>
              <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                {MONTHS[view.m]} {view.y}
              </span>
              <button type="button" onClick={nextMonth} className={navBtn} aria-label="Next month">
                <FaChevronRight className="text-xs" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className={`text-center text-[11px] font-semibold py-1 ${
                    dark ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) =>
                d === null ? (
                  <span key={`e${i}`} />
                ) : (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      onChange(toISO(view.y, view.m, d));
                      setOpen(false);
                    }}
                    className={`h-9 rounded-lg text-sm transition ${
                      isSelected(d)
                        ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white font-semibold"
                        : isToday(d)
                          ? dark
                            ? "text-oceanic-300 ring-1 ring-oceanic-500/40"
                            : "text-oceanic-700 ring-1 ring-oceanic-500/40"
                          : dark
                            ? "text-slate-200 hover:bg-white/10"
                            : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>

            <div
              className={`flex justify-end mt-2 pt-2 border-t ${
                dark ? "border-gray-700" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`text-xs font-medium px-2 py-1 rounded-lg transition ${
                  dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Clear
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
