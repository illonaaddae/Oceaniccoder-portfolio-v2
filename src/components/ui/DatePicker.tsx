import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaRegCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface DatePickerProps {
  /** ISO date string "YYYY-MM-DD" or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
  placeholder?: string;
  ariaLabel?: string;
  /** Id of a visible label; the trigger is then named by it plus the shown date. */
  labelId?: string;
  /** "sm" matches CustomSelect's compact size (py-2, rounded-lg). */
  size?: "md" | "sm";
  className?: string;
  /** Earliest selectable date, ISO "YYYY-MM-DD". Mirrors `<input type="date" min>`. */
  min?: string;
  /** Latest selectable date, ISO "YYYY-MM-DD". Mirrors `<input type="date" max>`. */
  max?: string;
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
/** The ISO day `n` days after `iso`, computed on the local calendar (no time-zone drift). */
const shiftDays = (iso: string, n: number) => {
  const p = parseISO(iso);
  if (!p) return iso;
  const d = new Date(p.y, p.m, p.d + n);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Same day `n` months on, clamped to the target month's length (31 Jan + 1 → 28/29 Feb). */
const shiftMonths = (iso: string, n: number) => {
  const p = parseISO(iso);
  if (!p) return iso;
  const first = new Date(p.y, p.m + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toISO(first.getFullYear(), first.getMonth(), Math.min(p.d, last));
};

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
  labelId,
  size = "md",
  className = "",
  min,
  max,
}) => {
  const dark = theme === "dark";
  const [open, setOpen] = useState(false);
  const valueId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseISO(value), [value]);
  const today = new Date();

  const [view, setView] = useState(() =>
    parsed ? { y: parsed.y, m: parsed.m } : { y: today.getFullYear(), m: today.getMonth() },
  );
  // The day that holds the calendar's single tab stop (roving tabindex).
  const [focusDay, setFocusDay] = useState("");

  const inRange = (iso: string) => !(min && iso < min) && !(max && iso > max);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

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
    const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
    const start = parsed ? value : todayISO;
    setFocusDay(inRange(start) ? start : (min ?? max ?? start));
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
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Move focus to the roving day once the panel is placed, and after each move.
  useEffect(() => {
    if (!open || !coords || !focusDay) return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusDay}"]`)?.focus();
  }, [open, coords, focusDay, view]);

  const moveFocus = (iso: string) => {
    if (!inRange(iso)) return;
    const p = parseISO(iso);
    if (p && (p.y !== view.y || p.m !== view.m)) setView({ y: p.y, m: p.m });
    setFocusDay(iso);
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const p = parseISO(focusDay);
    if (!p) return;
    const weekday = new Date(p.y, p.m, p.d).getDay();
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shiftDays(focusDay, -1),
      ArrowRight: () => shiftDays(focusDay, 1),
      ArrowUp: () => shiftDays(focusDay, -7),
      ArrowDown: () => shiftDays(focusDay, 7),
      Home: () => shiftDays(focusDay, -weekday),
      End: () => shiftDays(focusDay, 6 - weekday),
      PageUp: () => shiftMonths(focusDay, e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(focusDay, e.shiftKey ? 12 : 1),
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    moveFocus(next());
  };

  // Keep Tab inside the open panel: it is portalled to <body>, so without this
  // Tab would walk the whole page before reaching it.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const stops = Array.from(
      panelRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    ).filter((b) => b.tabIndex >= 0);
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // The month buttons keep focus on themselves; the roving day follows the view.
  const showMonth = (n: number) => {
    const p = parseISO(focusDay);
    const next = p
      ? shiftMonths(focusDay, n)
      : toISO(
          view.m + n < 0 ? view.y - 1 : view.m + n > 11 ? view.y + 1 : view.y,
          (view.m + n + 12) % 12,
          1,
        );
    const q = parseISO(next)!;
    setView({ y: q.y, m: q.m });
    setFocusDay(next);
  };
  const prevMonth = () => showMonth(-1);
  const nextMonth = () => showMonth(1);

  const display = parsed ? `${MONTHS_SHORT[parsed.m]} ${parsed.d}, ${parsed.y}` : "";

  const sizeClass = size === "sm" ? "px-3 py-2 rounded-lg" : "px-3.5 py-2.5 rounded-xl";
  const triggerClass = `w-full flex items-center justify-between gap-2 ${sizeClass} border transition-all duration-200 focus:outline-none focus:ring-2 text-sm ${
    dark
      ? "bg-gray-800/80 border-gray-700 text-white focus:border-oceanic-400 focus:ring-oceanic-400"
      : "bg-white border-oceanic-500/20 text-slate-900 focus:ring-oceanic-600"
  }`;

  const navBtn = `p-2 rounded-lg transition ${
    dark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
  }`;

  const isToday = (d: number) =>
    d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
  const isSelected = (d: number) =>
    !!parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === d;

  // Range checks compare ISO strings, which sort correctly by date and avoid
  // the timezone drift that comes from round-tripping through Date objects.
  const isOutOfRange = (d: number) => {
    const iso = toISO(view.y, view.m, d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  /** Whole-month check so month navigation can be disabled at the boundary. */
  const monthFullyBefore = (() => {
    if (!min) return false;
    return toISO(view.y, view.m, daysInMonth) < min;
  })();
  const monthFullyAfter = (() => {
    if (!max) return false;
    return toISO(view.y, view.m, 1) > max;
  })();

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId ? `${labelId} ${valueId}` : undefined}
      >
        <span id={valueId} className={display ? "" : dark ? "text-gray-500" : "text-slate-500"}>
          {display || placeholder}
        </span>
        <FaRegCalendarAlt className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`} />
      </button>

      {open &&
        coords &&
        createPortal(
          // The dialog listens for Tab only to keep focus inside it (APG dialog pattern).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div
            ref={panelRef}
            role="dialog"
            aria-label={labelId ? undefined : ariaLabel}
            aria-labelledby={labelId}
            onKeyDown={onPanelKeyDown}
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
                disabled={monthFullyBefore}
                style={monthFullyBefore ? { opacity: 0.3, cursor: "not-allowed" } : undefined}
              >
                <FaChevronLeft className="text-xs" />
              </button>
              <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                {MONTHS[view.m]} {view.y}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className={navBtn}
                aria-label="Next month"
                disabled={monthFullyAfter}
                style={monthFullyAfter ? { opacity: 0.3, cursor: "not-allowed" } : undefined}
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className={`text-center text-[11px] font-semibold py-1 ${
                    dark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKeyDown}>
              {cells.map((d, i) =>
                d === null ? (
                  <span key={`e${i}`} />
                ) : (
                  <button
                    key={d}
                    type="button"
                    data-iso={toISO(view.y, view.m, d)}
                    tabIndex={toISO(view.y, view.m, d) === focusDay ? 0 : -1}
                    aria-label={`${MONTHS[view.m]} ${d}, ${view.y}`}
                    aria-pressed={isSelected(d)}
                    aria-current={isToday(d) ? "date" : undefined}
                    disabled={isOutOfRange(d)}
                    aria-disabled={isOutOfRange(d)}
                    onClick={() => {
                      if (isOutOfRange(d)) return;
                      onChange(toISO(view.y, view.m, d));
                      close(true);
                    }}
                    className={`h-9 rounded-lg text-sm transition focus:outline-none focus-visible:ring-2 ${
                      dark ? "focus-visible:ring-oceanic-400" : "focus-visible:ring-oceanic-600"
                    } ${
                      isOutOfRange(d)
                        ? dark
                          ? "text-slate-600 cursor-not-allowed"
                          : "text-slate-300 cursor-not-allowed"
                        : isSelected(d)
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
                  close(true);
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
