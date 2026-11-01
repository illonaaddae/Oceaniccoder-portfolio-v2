// Small building blocks shared by the Finance views: money formatting,
// progress bars, labelled fields and buttons in the dashboard's tokens.
import type React from "react";
import { useId } from "react";
import { formatMinor, toMinor } from "@/utils/quoteMath";

export const muted: React.CSSProperties = { color: "var(--text-secondary)" };
export const strong: React.CSSProperties = { color: "var(--text-primary)" };

/** "GH₵ 1,250.00". */
export const cedis = (minor: number) => formatMinor(minor, "GH₵");

/** "2027-04" → "Apr 2027". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Pesewas → the text a money input starts with ("1250.5" style, no grouping). */
export const minorToInput = (minor: number) => (minor ? String(minor / 100) : "");

/** Money input text → pesewas, or null when it isn't a valid amount. */
export const inputToMinor = (text: string) => (text.trim() === "" ? 0 : toMinor(text));

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-xl p-4 sm:p-5" aria-label={title}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={muted}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A big figure with a label and an optional note under it. */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide" style={muted}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={strong}>
        {value}
      </p>
      {note && (
        <p className="mt-0.5 text-xs" style={muted}>
          {note}
        </p>
      )}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: "var(--bg-tertiary)" }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "var(--accent-teal)" }}
      />
    </div>
  );
}

const fieldClass = "w-full rounded-lg border bg-transparent px-3 py-2 text-sm";
const fieldStyle: React.CSSProperties = {
  borderColor: "var(--border-subtle)",
  color: "var(--text-primary)",
  background: "var(--bg-secondary)",
};

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  maxLength,
  inputMode,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "month";
  required?: boolean;
  maxLength?: number;
  inputMode?: "decimal";
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold" style={muted}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        style={fieldStyle}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs" style={muted}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** A GH₵ amount typed as text ("1,250.50"); the parent parses it with inputToMinor. */
export function MoneyField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return <TextField {...props} inputMode="decimal" placeholder="0.00" maxLength={16} />;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold" style={muted}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value as T)}
        className={fieldClass}
        style={fieldStyle}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  /** Accessible name when the visible text alone is ambiguous. */
  label?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent-teal)", color: "#fff", borderColor: "var(--accent-teal)" },
    secondary: { borderColor: "var(--border-subtle)", color: "var(--text-primary)" },
    danger: { borderColor: "var(--status-failed-border)", color: "var(--status-failed-text)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

/** A form's inline error, announced when it appears. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium" style={{ color: "var(--status-failed-text)" }}>
      {message}
    </p>
  );
}
