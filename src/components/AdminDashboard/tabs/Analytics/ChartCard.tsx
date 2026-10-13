import type React from "react";
import { useId } from "react";
import { InfoTip } from "./KpiExtras";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

/** Series colours: Analytics tokens that switch with the light and dark themes. */
export const CHART_COLORS = {
  invoice: "var(--analytics-s-invoice)",
  quote: "var(--analytics-s-quote)",
  previous: "var(--analytics-s-prev)",
  grid: "var(--analytics-line)",
  axis: "var(--text-secondary)",
} as const;

export const axisTick = { fill: CHART_COLORS.axis, fontSize: 11 };

/** A legend in the card header. The swatch carries the colour; the text stays in text tokens. */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs" style={muted} aria-hidden="true">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={
              item.dashed
                ? "inline-block w-3.5 border-t-2 border-dashed"
                : "h-2.5 w-2.5 rounded-[3px]"
            }
            style={item.dashed ? { borderColor: item.color } : { background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartCardProps {
  title: string;
  /** A short line under the title saying what is shown; read out with the card. */
  description: string;
  /** The longer how-it's-counted note, behind an ⓘ. */
  info?: React.ReactNode;
  /** Shown at the right of the header, e.g. a legend. */
  aside?: React.ReactNode;
  id?: string;
  loading?: boolean;
  error?: string | null;
  /** Shown instead of the chart when there's nothing to plot. */
  empty?: string | null;
  /**
   * With `table`: a chart, hidden from screen readers because the table
   * carries the same data. Without: ordinary content (a list or table).
   */
  children: React.ReactNode;
  /** The chart's data as a table, behind a disclosure. */
  table?: React.ReactNode;
  /** Anything after the chart, e.g. a drill-down list. */
  footer?: React.ReactNode;
}

/** A titled card for a chart (with its data table) or a breakdown, with loading, error and empty states. */
export function ChartCard({
  title,
  description,
  info,
  aside,
  id,
  loading,
  error,
  empty,
  children,
  table,
  footer,
}: ChartCardProps) {
  const titleId = useId();
  const descId = useId();
  let body: React.ReactNode;
  if (loading) body = <p style={muted}>Loading…</p>;
  // Not an alert: the tab's error banner already announces the failure.
  else if (error) body = <p style={{ color: "var(--status-failed-text)" }}>{error}</p>;
  else if (empty) body = <p style={muted}>{empty}</p>;
  else if (table === undefined) body = children;
  else
    body = (
      <>
        <div aria-hidden="true">{children}</div>
        <details className="mt-3">
          <summary
            className="cursor-pointer text-xs font-semibold"
            style={{ color: "var(--accent-teal)" }}
          >
            Show the data as a table
          </summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      </>
    );
  return (
    <section
      id={id}
      className="glass-card min-w-0 scroll-mt-28 p-4 sm:p-5"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1" style={muted}>
            <h3 id={titleId} className="text-base font-bold" style={strong}>
              {title}
            </h3>
            {info && <InfoTip label={`About ${title.toLowerCase()}`}>{info}</InfoTip>}
          </div>
          <p id={descId} className="text-xs" style={muted}>
            {description}
          </p>
        </div>
        {!loading && !error && !empty && aside}
      </div>
      {body}
      {!loading && !error && footer}
    </section>
  );
}
