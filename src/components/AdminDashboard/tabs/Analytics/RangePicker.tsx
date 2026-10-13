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
import { formatDay } from "./metrics/format";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const PRESETS: Preset[] = ["7d", "30d", "90d", "12m", "custom"];

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

/** Preset ranges plus custom dates, and the period the deltas compare with. */
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span id={groupId} className="text-sm" style={muted}>
          Range
        </span>
        <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={selected === p}
              onClick={() => pick(p)}
              className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--accent-teal-subtle)]"
              style={
                selected === p
                  ? {
                      borderColor: "var(--accent-teal)",
                      background: "var(--accent-teal-subtle)",
                      color: "var(--text-primary)",
                    }
                  : { borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }
              }
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {editing && (
        <form onSubmit={apply} className="flex flex-wrap items-end gap-2" noValidate>
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

      <p className="text-xs tabular-nums" style={muted}>
        {formatDay(range.from)} to {formatDay(range.to)}, compared with {formatDay(previous.from)}{" "}
        to {formatDay(previous.to)}. Days are UTC (Ghana time).
      </p>
    </div>
  );
}
