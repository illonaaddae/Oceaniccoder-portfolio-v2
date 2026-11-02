// Small building blocks shared by the Finance views: money formatting,
// progress bars, labelled fields and buttons. Fields reuse the dashboard's
// design-system controls (CustomSelect, DatePicker, MonthPicker) and the
// input styling of the Analytics expense log, so Finance looks like the rest
// of the admin.
import type React from "react";
import { createContext, useContext, useId } from "react";
import { formatMinor, toMinor } from "@/utils/quoteMath";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { MonthPicker } from "@/components/ui/MonthPicker";

type Theme = "light" | "dark";

/** The dashboard theme, provided once by FinanceTab for the themed controls. */
export const FinanceThemeContext = createContext<Theme>("dark");
const useTheme = () => useContext(FinanceThemeContext);

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
      style={{ background: "var(--analytics-line)" }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "var(--analytics-accent)" }}
      />
    </div>
  );
}

/** Matches CustomSelect and DatePicker at size "sm", as the Analytics expense log does. */
const inputClass = (theme: Theme) =>
  `block w-full rounded-lg border px-3 py-2 text-sm font-normal transition-all duration-200 focus:outline-none focus:ring-2 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-400 focus:border-oceanic-400 focus:ring-oceanic-400"
      : "bg-white/50 border-oceanic-200/50 text-slate-900 placeholder-slate-500 focus:ring-oceanic-600"
  }`;

function FieldLabel({
  id,
  htmlFor,
  label,
  required,
}: {
  id?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
}) {
  const asterisk = required && <span aria-hidden="true"> *</span>;
  if (htmlFor)
    return (
      <label id={id} htmlFor={htmlFor} className="text-xs font-semibold" style={muted}>
        {label}
        {asterisk}
      </label>
    );
  // The pickers are named through aria-labelledby, which reads hidden text
  // too, so the id goes on the words alone and the asterisk sits outside.
  return (
    <span className="text-xs font-semibold" style={muted}>
      <span id={id}>
        {label}
        {/* A button can't carry aria-required; the name says it instead. */}
        {required && <span className="sr-only"> (required)</span>}
      </span>
      {asterisk}
    </span>
  );
}

function Hint({ id, hint }: { id: string; hint?: string }) {
  if (!hint) return null;
  return (
    <p id={id} className="text-xs" style={muted}>
      {hint}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  maxLength,
  inputMode,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  inputMode?: "decimal";
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(theme)}${inputMode === "decimal" ? " tabular-nums" : ""}`}
      />
      <Hint id={`${id}-hint`} hint={hint} />
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

/** A day, "YYYY-MM-DD". A required date can't be cleared back to empty. */
export function DateField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel id={id} label={label} required={required} />
      <DatePicker
        value={value}
        onChange={(v) => {
          if (v || !required) onChange(v);
        }}
        theme={theme}
        labelId={id}
        describedBy={hint ? `${id}-hint` : undefined}
        size="sm"
        placeholder="Pick a date"
      />
      <Hint id={`${id}-hint`} hint={hint} />
    </div>
  );
}

/** A month, "YYYY-MM". */
export function MonthField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const id = useId();
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel id={id} label={label} />
      <MonthPicker
        value={value}
        onChange={onChange}
        theme={theme}
        labelId={id}
        describedBy={hint ? `${id}-hint` : undefined}
        size="sm"
      />
      <Hint id={`${id}-hint`} hint={hint} />
    </div>
  );
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
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel id={id} label={label} required={required} />
      <CustomSelect
        value={value}
        onChange={(v) => onChange(v as T)}
        options={options}
        theme={theme}
        labelId={id}
        size="sm"
      />
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
  /** "quiet" is a borderless text action for things done rarely. */
  variant?: "primary" | "secondary" | "danger" | "quiet";
  /**
   * Its request is running. The button stays focusable and announced as
   * unavailable (aria-disabled) and ignores presses; a disabled button would
   * drop focus to the page for a keyboard user who just pressed it.
   */
  disabled?: boolean;
  /** Accessible name when the visible text alone is ambiguous. */
  label?: string;
}) {
  const theme = useTheme();
  const ring =
    theme === "dark" ? "focus-visible:ring-oceanic-400" : "focus-visible:ring-oceanic-600";
  const look = {
    primary: "border-oceanic-600 bg-oceanic-600 text-white hover:bg-oceanic-700",
    secondary: "hover:bg-[var(--accent-teal-subtle)]",
    danger: "hover:bg-[var(--status-failed-bg)]",
    quiet: "border-transparent px-1.5 underline-offset-4 hover:underline",
  }[variant];
  const colours: Record<string, React.CSSProperties | undefined> = {
    primary: undefined,
    secondary: { borderColor: "var(--border-subtle)", color: "var(--text-primary)" },
    danger: { borderColor: "var(--status-failed-border)", color: "var(--status-failed-text)" },
    quiet: { color: "var(--text-secondary)" },
  };
  return (
    <button
      type={type}
      onClick={(e) => {
        // Also stops a busy submit button sending its form again.
        if (disabled) return e.preventDefault();
        onClick?.();
      }}
      aria-disabled={disabled || undefined}
      aria-label={label}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${ring} ${look}`}
      style={colours[variant]}
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
