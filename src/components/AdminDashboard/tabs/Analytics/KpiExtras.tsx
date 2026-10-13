// Small lines that sit inside a shared KpiCard on the Analytics tab.
import type React from "react";
import type { CurrencyTotals } from "../shared/money";
import {
  approxTotal,
  describeDelta,
  formatApproxGHS,
  formatDelta,
  ratesNote,
} from "./metrics/format";
import type { Delta } from "./metrics/range";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };

/**
 * The change on the previous period. `upIsGood` colours a rise as good
 * (revenue) or bad (expenses); the words carry the meaning either way.
 */
export function DeltaLine({
  delta,
  unitLabel,
  upIsGood = true,
}: {
  delta: Delta;
  /** What the delta is measured in, e.g. "GHS" or "approx. GHS". */
  unitLabel: string;
  upIsGood?: boolean;
}) {
  const rising = delta.kind === "change" && delta.ratio > 0;
  const falling = delta.kind === "change" && delta.ratio < 0;
  const good = (rising && upIsGood) || (falling && !upIsGood);
  const bad = (falling && upIsGood) || (rising && !upIsGood);
  const color = good
    ? "var(--status-success-text)"
    : bad
      ? "var(--status-failed-text)"
      : "var(--text-secondary)";
  return (
    <p className="mt-1 text-xs">
      <span aria-hidden="true" className="font-semibold tabular-nums" style={{ color }}>
        {formatDelta(delta)}
      </span>
      <span className="sr-only">{`${describeDelta(delta)}, in ${unitLabel}`}</span>
      <span aria-hidden="true" style={muted}>
        {" "}
        vs previous period ({unitLabel})
      </span>
    </p>
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
    <p className="mt-1 text-xs tabular-nums" style={muted}>
      {formatApproxGHS(amount)} combined, {ratesNote()}
      {missing.length > 0 && ` (leaves out ${missing.join(", ")}: no rate set)`}
    </p>
  );
}
