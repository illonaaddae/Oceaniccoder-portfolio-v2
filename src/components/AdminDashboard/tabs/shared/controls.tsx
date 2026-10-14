// Small controls shared by the Payments and Invoices tabs.
import type React from "react";
import { useId } from "react";
import { FaSearch, FaSync, FaTimes } from "react-icons/fa";
import { CustomSelect } from "@/components/ui/CustomSelect";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };

const timeOf = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** "Updated hh:mm:ss" and the Refresh button, for TabHeader's action slot. */
export function RefreshControl({
  updatedAt,
  stale = false,
  loading,
  onRefresh,
}: {
  updatedAt: Date | null;
  stale?: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {updatedAt && (
        <p className="text-xs tabular-nums" style={muted}>
          {stale
            ? `Couldn't refresh. Last updated ${timeOf(updatedAt)}`
            : `Updated ${timeOf(updatedAt)}`}
        </p>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent-teal-subtle)] disabled:opacity-60"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      >
        <FaSync aria-hidden="true" className={loading ? "animate-spin" : ""} /> Refresh
      </button>
    </div>
  );
}

/** A dismissible, announced error message (tabs have no toast). */
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium"
      style={{
        background: "var(--status-failed-bg)",
        borderColor: "var(--status-failed-border)",
        color: "var(--status-failed-text)",
      }}
    >
      <span>{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="rounded p-1">
        <FaTimes aria-hidden="true" />
      </button>
    </div>
  );
}

/** A labelled search box (the label is visually hidden). */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative flex-1">
      <span className="sr-only">{label}</span>
      <FaSearch
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs"
        style={muted}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-transparent py-2 pl-9 pr-3 text-sm"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      />
    </label>
  );
}

/** The design-system dropdown with a visible label, sized for filter bars. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  theme,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  theme: "light" | "dark";
}) {
  const labelId = useId();
  return (
    <div className="flex items-center gap-2 text-sm" style={muted}>
      <span id={labelId}>{label}</span>
      <CustomSelect
        value={value}
        onChange={(v) => onChange(v as T)}
        options={options}
        theme={theme}
        labelId={labelId}
        size="sm"
        className="min-w-[10.5rem]"
      />
    </div>
  );
}
