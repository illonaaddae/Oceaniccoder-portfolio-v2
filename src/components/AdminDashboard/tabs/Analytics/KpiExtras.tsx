// Small pieces shared by the Analytics cards: info tips, delta chips,
// sparklines and the approx. GHS line.
import type React from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CurrencyTotals } from "../shared/money";
import { approxTotal, describeDelta, formatApproxGHS, ratesNote } from "./metrics/format";
import type { Delta } from "./metrics/range";
import type { MoneyUnit } from "./metrics/revenue";
import type { SourceErrors } from "./useAnalyticsData";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };

const EDGE = 8;

/** Says in words what the chip's colour says. */
const VERDICT = { good: ", better than before", bad: ", worse than before", flat: "" } as const;

export const leavesOut = (missing: string[]) => `(leaves out ${missing.join(", ")}: no rate set)`;

/**
 * What the owed figures are missing because invoices or quotes failed:
 * everything (`all`), one source (a "leaves out" note), or null when both loaded.
 */
export function owedGap(errors: SourceErrors): { all: boolean; note: string } | null {
  if (errors.invoices && errors.quotes)
    return { all: true, note: "Invoices and quotes couldn't load." };
  if (errors.invoices || errors.quotes)
    return {
      all: false,
      note: `Leaves out ${errors.invoices ? "one-off invoices" : "quote stages"}: they couldn't load.`,
    };
  return null;
}

/** Currencies in any of the totals that the approx. unit can't convert. */
export function unconverted(unit: MoneyUnit, ...totals: CurrencyTotals[]): string[] {
  if (unit.kind !== "approx") return [];
  return [...new Set(totals.flatMap((t) => approxTotal(t).missing))].sort();
}

/**
 * An ⓘ button whose explanation shows on hover and focus, stays while the
 * pointer is over it, and closes on Escape. The text is the button's
 * description, so screen readers read it with the button.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const bubble = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Centred under the button, the bubble can run off a narrow screen and make
  // the page scroll sideways; nudge it back inside.
  useLayoutEffect(() => {
    if (!open || !bubble.current) {
      setShift(0);
      return;
    }
    const { left, right } = bubble.current.getBoundingClientRect();
    if (left < EDGE) setShift(EDGE - left);
    else if (right > window.innerWidth - EDGE) setShift(window.innerWidth - EDGE - right);
  }, [open]);

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tipId}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // Touch has no hover; a tap opens it and tapping elsewhere closes it.
        onClick={() => setOpen(true)}
        className="grid h-6 w-6 cursor-help place-items-center rounded-full"
      >
        <span
          aria-hidden="true"
          className="grid h-[18px] w-[18px] place-items-center rounded-full border text-[11px] font-bold leading-none"
          style={{ borderColor: "currentColor" }}
        >
          i
        </span>
      </button>
      <span
        ref={bubble}
        id={tipId}
        role="tooltip"
        hidden={!open}
        className="absolute left-1/2 top-full z-[4] w-60 max-w-[calc(100vw-2rem)] rounded-lg px-3 py-2 text-left text-xs font-medium normal-case leading-snug tracking-normal shadow-lg"
        style={{
          background: "var(--analytics-tip-bg)",
          color: "var(--analytics-tip-ink)",
          transform: `translateX(calc(-50% + ${shift}px))`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * The change on the previous period as a chip: ▲/▼ and the size. `upIsGood`
 * colours a rise as good (revenue) or bad (expenses); the screen-reader text
 * carries the meaning without the colour.
 */
export function DeltaChip({
  delta,
  unitLabel,
  upIsGood = true,
}: {
  delta: Delta;
  /** What the delta is measured in, e.g. "GHS" or "approx. GHS". */
  unitLabel: string;
  upIsGood?: boolean;
}) {
  const pct = delta.kind === "change" ? Math.round(delta.ratio * 100) : 0;
  const tone = pct === 0 ? "flat" : pct > 0 === upIsGood ? "good" : "bad";
  const shown =
    delta.kind === "none"
      ? "–"
      : delta.kind === "new"
        ? "New"
        : `${pct > 0 ? "▲ " : pct < 0 ? "▼ " : ""}${Math.abs(pct)}%`;
  return (
    <span className="analytics-chip tabular-nums" data-tone={tone}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{`${describeDelta(delta)}, in ${unitLabel}${VERDICT[tone]}`}</span>
    </span>
  );
}

/** A small area line of the per-period values; decorative, the figures carry the data. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 200;
  const h = 36;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map(
    (v, i) =>
      `${((i * w) / (values.length - 1)).toFixed(1)} ${(h - 3 - ((v - min) / span) * (h - 8)).toFixed(1)}`,
  );
  const line = `M${points.join(" L")}`;
  return (
    <svg
      className="analytics-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="currentColor" fillOpacity={0.18} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The combined figure in GHS, only when there's more than GHS to combine.
 * Always labelled approx. with the rates' date, and names any currency left out.
 */
export function ApproxLine({ totals }: { totals: CurrencyTotals }) {
  if (totals.length === 0 || (totals.length === 1 && totals[0].currency === "GHS")) return null;
  const { amount, missing } = approxTotal(totals);
  return (
    <p className="text-xs tabular-nums" style={muted}>
      {formatApproxGHS(amount)} combined, {ratesNote()}
      {missing.length > 0 && ` ${leavesOut(missing)}`}
    </p>
  );
}
