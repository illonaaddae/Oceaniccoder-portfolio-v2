// Controls the CV tab needs on top of the Finance building blocks it reuses
// (../Finance/ui): a multi-line field, the Show on CV switch and a badge.
import type React from "react";
import { useContext, useId } from "react";
import { FinanceThemeContext, inputClass, muted } from "../Finance/ui";

/** Brand fill behind the white knob (see BRAND_FILL in Quotes/editorSteps). */
const BRAND_FILL = "#085866";

/** Several lines of text, such as one bullet per line. */
export function TextAreaField({
  label,
  name,
  value,
  onChange,
  hint,
  rows = 4,
  maxLength,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  const theme = useContext(FinanceThemeContext);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold" style={muted}>
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        maxLength={maxLength}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(theme)}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs" style={muted}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Show on CV. Busy while its change runs: it stays focusable and announced as
 * unavailable, as the Finance buttons do.
 */
export function ShowSwitch({
  checked,
  name,
  busy,
  onChange,
}: {
  checked: boolean;
  /** The item, for the accessible name "Show on CV: <name>". */
  name: string;
  busy?: boolean;
  onChange: (show: boolean) => void;
}) {
  const theme = useContext(FinanceThemeContext);
  const ring =
    theme === "dark" ? "focus-visible:ring-oceanic-400" : "focus-visible:ring-oceanic-600";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Show on CV: ${name}`}
      aria-disabled={busy || undefined}
      onClick={() => {
        if (!busy) onChange(!checked);
      }}
      className={`flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm focus:outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${ring}`}
      style={{ color: "var(--text-primary)" }}
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors"
        style={
          checked
            ? { background: BRAND_FILL, borderColor: "var(--accent-teal)" }
            : { borderColor: "var(--text-secondary)" }
        }
      >
        <span
          className={`absolute h-4 w-4 rounded-full transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
          style={{ background: checked ? "#ffffff" : "var(--text-secondary)" }}
        />
      </span>
      <span aria-hidden="true">Show on CV</span>
    </button>
  );
}

/** A short label next to an item's name. `tone="warning"` for something that needs the owner. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const style: React.CSSProperties =
    tone === "warning"
      ? {
          background: "var(--status-pending-bg)",
          color: "var(--status-pending-text)",
          borderColor: "var(--status-pending-border)",
        }
      : { borderColor: "var(--border-subtle)", color: "var(--text-secondary)" };
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs font-semibold" style={style}>
      {children}
    </span>
  );
}
