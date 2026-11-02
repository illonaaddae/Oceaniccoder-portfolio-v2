import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface MonthPickerProps {
  /** "YYYY-MM". */
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
  ariaLabel?: string;
  /** Id of a visible label; the controls are then named by it. */
  labelId?: string;
  /** "sm" matches CustomSelect and DatePicker at size "sm" (py-2, rounded-lg). */
  size?: "md" | "sm";
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

const PANEL_W = 264;
const PANEL_H = 236; // approx, for the flip check

const pad = (n: number) => String(n).padStart(2, "0");
const toMonth = (y: number, m: number) => `${y}-${pad(m + 1)}`;

const parseMonth = (s: string): { y: number; m: number } | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(s);
  if (!match) return null;
  const m = Number(match[2]) - 1;
  return m >= 0 && m < 12 ? { y: Number(match[1]), m } : null;
};

/** The month `n` months after "YYYY-MM". */
const shift = (month: string, n: number) => {
  const p = parseMonth(month);
  if (!p) return month;
  const total = p.y * 12 + p.m + n;
  return toMonth(Math.floor(total / 12), ((total % 12) + 12) % 12);
};

const thisMonth = () => {
  const d = new Date();
  return toMonth(d.getFullYear(), d.getMonth());
};

/**
 * Design-system month picker, the month sibling of DatePicker: a themed
 * replacement for `<input type="month">`, whose popup is an unstyled OS
 * surface. The arrows step one month; the name opens a year of months.
 * Emits and takes "YYYY-MM".
 */
export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  theme,
  ariaLabel,
  labelId,
  size = "md",
  className = "",
}) => {
  const dark = theme === "dark";
  const valueId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = parseMonth(value);
  const [year, setYear] = useState(() => parsed?.y ?? new Date().getFullYear());
  // The month that holds the grid's single tab stop (roving tabindex).
  const [focusMonth, setFocusMonth] = useState(value);
  const pendingFocus = useRef(false);

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
    if (top + PANEL_H > window.innerHeight - 8 && r.top - PANEL_H - 6 > 8) {
      top = r.top - PANEL_H - 6;
    }
    setCoords({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const start = parsed ? value : thisMonth();
    setYear(parseMonth(start)!.y);
    setFocusMonth(start);
    pendingFocus.current = true;
    reposition();
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
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
    // Capture phase, and stop it there, as DatePicker does: an enclosing Modal
    // also closes on Escape and would lose the user's form.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close(true);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // Focus follows the roving month only on open and after a grid key, so the
  // year buttons keep focus when pressed.
  useEffect(() => {
    if (!pendingFocus.current || !open || !coords) return;
    const cell = panelRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focusMonth}"]`);
    if (!cell) return;
    pendingFocus.current = false;
    cell.focus();
  }, [open, coords, focusMonth, year]);

  const pick = (month: string) => {
    onChange(month);
    close(true);
  };

  const moveFocus = (month: string) => {
    const p = parseMonth(month);
    if (p && p.y !== year) setYear(p.y);
    pendingFocus.current = true;
    setFocusMonth(month);
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -4,
      ArrowDown: 4,
      PageUp: -12,
      PageDown: 12,
    };
    const n = moves[e.key];
    if (n === undefined) return;
    e.preventDefault();
    moveFocus(shift(focusMonth, n));
  };

  const showYear = (n: number) => {
    setYear((y) => y + n);
    setFocusMonth((f) => shift(f, n * 12));
  };

  // Keep Tab inside the open panel: it is portalled to <body>.
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

  const display = parsed ? `${MONTHS[parsed.m]} ${parsed.y}` : "Select month";
  const current = thisMonth();

  const radius = size === "sm" ? "rounded-lg" : "rounded-xl";
  const shell = `flex items-stretch ${radius} border text-sm transition-all duration-200 focus-within:ring-2 ${
    dark
      ? "bg-gray-800/80 border-gray-700 text-white focus-within:border-oceanic-400 focus-within:ring-oceanic-400"
      : "bg-white border-oceanic-500/20 text-slate-900 focus-within:ring-oceanic-600"
  }`;
  const stepBtn = `px-3 transition focus:outline-none ${
    dark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
  }`;
  const navBtn = `p-2 rounded-lg transition focus:outline-none focus-visible:ring-2 ${
    dark
      ? "text-slate-300 hover:bg-white/10 focus-visible:ring-oceanic-400"
      : "text-slate-600 hover:bg-slate-100 focus-visible:ring-oceanic-600"
  }`;
  const divider = dark ? "border-gray-700" : "border-oceanic-500/20";
  const named = (action: string) =>
    labelId ? { "aria-label": undefined, "aria-labelledby": `${labelId} ${action}` } : {};
  const prevId = `${valueId}-prev`;
  const nextId = `${valueId}-next`;

  return (
    <div className={`relative ${className}`}>
      <div className={shell}>
        <button
          type="button"
          onClick={() => parsed && onChange(shift(value, -1))}
          className={`${stepBtn} ${size === "sm" ? "rounded-l-lg" : "rounded-l-xl"} border-r ${divider}`}
          aria-label={`Previous month${ariaLabel ? `, ${ariaLabel}` : ""}`}
          {...named(prevId)}
        >
          <span id={prevId} hidden>
            previous month
          </span>
          <FaChevronLeft className="text-xs" aria-hidden="true" />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex flex-1 items-center justify-center gap-2 px-3 font-semibold tabular-nums focus:outline-none ${
            size === "sm" ? "py-2" : "py-2.5"
          }`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={labelId ? undefined : ariaLabel}
          aria-labelledby={labelId ? `${labelId} ${valueId}` : undefined}
        >
          <span id={valueId} className="whitespace-nowrap">
            {display}
          </span>
          <FaChevronDown
            aria-hidden="true"
            className={`text-[10px] transition-transform ${open ? "rotate-180" : ""} ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => parsed && onChange(shift(value, 1))}
          className={`${stepBtn} ${size === "sm" ? "rounded-r-lg" : "rounded-r-xl"} border-l ${divider}`}
          aria-label={`Next month${ariaLabel ? `, ${ariaLabel}` : ""}`}
          {...named(nextId)}
        >
          <span id={nextId} hidden>
            next month
          </span>
          <FaChevronRight className="text-xs" aria-hidden="true" />
        </button>
      </div>

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
            className={`z-[110] rounded-xl border shadow-2xl p-3 ${
              dark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => showYear(-1)}
                className={navBtn}
                aria-label="Previous year"
              >
                <FaChevronLeft className="text-xs" aria-hidden="true" />
              </button>
              <span
                className={`text-sm font-semibold tabular-nums ${dark ? "text-white" : "text-slate-900"}`}
                aria-live="polite"
              >
                {year}
              </span>
              <button
                type="button"
                onClick={() => showYear(1)}
                className={navBtn}
                aria-label="Next year"
              >
                <FaChevronRight className="text-xs" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1" onKeyDown={onGridKeyDown}>
              {MONTHS_SHORT.map((label, m) => {
                const month = toMonth(year, m);
                const selected = month === value;
                const isCurrent = month === current;
                return (
                  <button
                    key={month}
                    type="button"
                    data-month={month}
                    tabIndex={month === focusMonth ? 0 : -1}
                    aria-label={`${MONTHS[m]} ${year}`}
                    aria-pressed={selected}
                    aria-current={isCurrent ? "date" : undefined}
                    onClick={() => pick(month)}
                    className={`h-10 rounded-lg text-sm transition focus:outline-none focus-visible:ring-2 ${
                      dark ? "focus-visible:ring-oceanic-400" : "focus-visible:ring-oceanic-600"
                    } ${
                      selected
                        ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white font-semibold"
                        : isCurrent
                          ? dark
                            ? "text-oceanic-300 ring-1 ring-oceanic-500/40"
                            : "text-oceanic-700 ring-1 ring-oceanic-500/40"
                          : dark
                            ? "text-slate-200 hover:bg-white/10"
                            : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div
              className={`mt-2 flex justify-end border-t pt-2 ${
                dark ? "border-gray-700" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => pick(current)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                  dark
                    ? "text-oceanic-300 hover:bg-white/10"
                    : "text-oceanic-700 hover:bg-slate-100"
                }`}
              >
                This month
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
