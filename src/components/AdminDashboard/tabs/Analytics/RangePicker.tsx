import type React from "react";
import { useId, useState } from "react";
import {
  PRESET_LABELS,
  customRangeError,
  todayUTC,
  type DateRange,
  type Preset,
  type RangeChoice,
} from "./metrics/range";
import { formatDay, formatSpan } from "./metrics/format";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const PRESETS: Preset[] = ["7d", "30d", "90d", "12m", "custom"];
const SHORT_LABELS: Record<Preset, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "12m": "12M",
  custom: "Custom",
};

const inputStyle: React.CSSProperties = {
  borderColor: "var(--border-subtle)",
  color: "var(--text-primary)",
  background: "var(--bg-primary)",
};

interface RangePickerProps {
  choice: RangeChoice;
  range: DateRange;
  previous: DateRange;
  onChange: (choice: RangeChoice) => void;
  /** Injectable clock for tests. */
  now?: Date;
}

/**
 * Preset ranges plus custom dates, and the period the deltas compare with.
 * Its parts flow into the parent's flex row; the custom form takes a row of its own.
 */
export function RangePicker({ choice, range, previous, onChange, now }: RangePickerProps) {
  const groupId = useId();
  const errorId = useId();
  const [from, setFrom] = useState(choice.from ?? range.from);
  const [to, setTo] = useState(choice.to ?? range.to);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(choice.preset === "custom");
  const max = todayUTC(now);

  const pick = (preset: Preset) => {
    setError(null);
    if (preset === "custom") {
      setEditing(true);
      return;
    }
    setEditing(false);
    onChange({ preset });
  };

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = customRangeError(from, to, now);
    setError(problem);
    if (!problem) onChange({ preset: "custom", from, to });
  };

  const selected = editing ? "custom" : choice.preset;

  return (
    <div className="contents">
      <span id={groupId} className="sr-only">
        Range
      </span>
      <div
        role="group"
        aria-labelledby={groupId}
        className="inline-flex flex-wrap gap-0.5 rounded-[10px] p-[3px]"
        style={{ background: "var(--analytics-line-soft)" }}
      >
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={selected === p}
            onClick={() => pick(p)}
            className="rounded-lg px-3 py-1.5 text-[13px] font-bold transition"
            style={
              selected === p
                ? {
                    background: "var(--analytics-card)",
                    color: "var(--text-primary)",
                    boxShadow: "0 1px 2px rgba(15, 23, 36, 0.12)",
                  }
                : { color: "var(--text-secondary)" }
            }
          >
            {SHORT_LABELS[p]}
            {p !== "custom" && <span className="sr-only">{` (${PRESET_LABELS[p]})`}</span>}
          </button>
        ))}
      </div>

      <p className="text-[12.5px] tabular-nums" style={muted}>
        <span aria-hidden="true">
          {formatSpan(range, max.slice(0, 4))} · vs {formatSpan(previous, max.slice(0, 4))}
        </span>
        <span className="sr-only">
          {formatDay(range.from)} to {formatDay(range.to)}, compared with {formatDay(previous.from)}{" "}
          to {formatDay(previous.to)}.
        </span>
      </p>

      {editing && (
        <form
          onSubmit={apply}
          className="order-last flex basis-full flex-wrap items-end gap-2"
          noValidate
        >
          <label className="flex flex-col text-xs" style={muted}>
            From
            <input
              type="date"
              value={from}
              max={max}
              onChange={(e) => setFrom(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 rounded-lg border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col text-xs" style={muted}>
            To
            <input
              type="date"
              value={to}
              max={max}
              onChange={(e) => setTo(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="mt-1 rounded-lg border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--accent-teal-subtle)]"
            style={{ borderColor: "var(--accent-teal)", color: "var(--text-primary)" }}
          >
            Apply
          </button>
          {error && (
            <p
              id={errorId}
              role="alert"
              className="w-full text-xs"
              style={{ color: "var(--status-failed-text)" }}
            >
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
