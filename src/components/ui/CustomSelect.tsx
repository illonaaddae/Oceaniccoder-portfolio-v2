import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaCheck, FaSearch } from "react-icons/fa";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading visual (e.g. a skill icon). */
  icon?: React.ReactNode;
}

export interface SelectGroup {
  group: string;
  options: SelectOption[];
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Grouped options (rendered with group headers). */
  groups?: SelectGroup[];
  /** Flat options (alternative to groups). */
  options?: SelectOption[];
  placeholder?: string;
  theme: "light" | "dark";
  searchable?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Design-system dropdown — a styled, accessible replacement for a native
 * <select>. Supports grouped options, per-option icons, type-to-filter search,
 * and keyboard navigation (↑/↓/Enter/Escape). Themed with oceanic/slate to
 * match the rest of the admin UI.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  groups,
  options,
  placeholder = "Select…",
  theme,
  searchable = false,
  ariaLabel,
  className = "",
}) => {
  const dark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const allGroups: SelectGroup[] = useMemo(
    () => groups ?? (options ? [{ group: "", options }] : []),
    [groups, options],
  );

  // Flatten + filter by the search query.
  const filteredGroups: SelectGroup[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({
        group: g.group,
        options: g.options.filter((o) => o.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.options.length > 0);
  }, [allGroups, query]);

  const flat: SelectOption[] = useMemo(
    () => filteredGroups.flatMap((g) => g.options),
    [filteredGroups],
  );

  const selected = useMemo(
    () => allGroups.flatMap((g) => g.options).find((o) => o.value === value),
    [allGroups, value],
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // On open: focus search, reset highlight to the current selection.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = flat.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep highlight in range as the filtered list shrinks.
  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const commit = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = flat[highlight];
      if (opt) commit(opt.value);
    }
  };

  const triggerClass = `w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-oceanic-500/50 ${
    dark
      ? "bg-gray-800/80 border-gray-700 text-white focus:border-oceanic-500/60"
      : "bg-white/50 border-oceanic-200/50 text-slate-900"
  }`;

  const panelClass = `absolute z-50 mt-2 w-full rounded-xl border shadow-xl overflow-hidden ${
    dark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200"
  }`;

  let runningIndex = -1;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {selected.icon}
            </span>
          )}
          <span className={`truncate ${selected ? "" : dark ? "text-gray-500" : "text-slate-500"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <FaChevronDown
          className={`flex-shrink-0 text-xs transition-transform duration-200 ${
            open ? "rotate-180" : ""
          } ${dark ? "text-slate-400" : "text-slate-500"}`}
        />
      </button>

      {open && (
        <div className={panelClass}>
          {searchable && (
            <div
              className={`flex items-center gap-2 px-3 py-2 border-b ${
                dark ? "border-gray-700" : "border-slate-200"
              }`}
            >
              <FaSearch className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                className={`w-full bg-transparent text-sm focus:outline-none ${
                  dark ? "text-white placeholder-gray-500" : "text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>
          )}

          <ul
            role="listbox"
            aria-label={ariaLabel}
            id={listboxId}
            className="max-h-72 overflow-y-auto py-1"
          >
            {flat.length === 0 && (
              <li className={`px-4 py-3 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                No matches
              </li>
            )}
            {filteredGroups.map((g) => (
              <React.Fragment key={g.group || "__flat"}>
                {g.group && (
                  <li
                    className={`px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider ${
                      dark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {g.group}
                  </li>
                )}
                {g.options.map((opt) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isSel = opt.value === value;
                  const isHi = idx === highlight;
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commit(opt.value);
                      }}
                      className={`flex items-center justify-between gap-2 mx-1 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        isHi
                          ? dark
                            ? "bg-oceanic-500/20 text-white"
                            : "bg-oceanic-500/10 text-slate-900"
                          : dark
                            ? "text-slate-200"
                            : "text-slate-700"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.icon && (
                          <span className="flex-shrink-0" aria-hidden="true">
                            {opt.icon}
                          </span>
                        )}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSel && <FaCheck className="flex-shrink-0 text-xs text-oceanic-400" />}
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
