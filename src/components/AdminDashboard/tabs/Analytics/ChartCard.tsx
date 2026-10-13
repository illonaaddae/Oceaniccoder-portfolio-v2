import type React from "react";
import { useId } from "react";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

/** Series colours: brand tokens that switch with the light and dark themes. */
export const CHART_COLORS = {
  primary: "var(--brand-ocean-2)",
  secondary: "var(--brand-ocean-4)",
  previous: "var(--text-secondary)",
  grid: "var(--border-subtle)",
  axis: "var(--text-secondary)",
} as const;

export const axisTick = { fill: CHART_COLORS.axis, fontSize: 11 };

/**
 * Recharts colours legend text with the series colour, which is too faint for
 * text on light backgrounds; the swatch keeps the colour, the label doesn't.
 */
export const legendLabel = (value: string) => (
  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
);

export const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  color: "var(--text-primary)",
};

interface ChartCardProps {
  title: string;
  /** What the chart shows and how it's counted; read out with the chart. */
  description: string;
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
      className="glass-card rounded-xl p-4 sm:p-5"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <h3 id={titleId} className="text-base font-bold" style={strong}>
        {title}
      </h3>
      <p id={descId} className="mb-3 text-xs" style={muted}>
        {description}
      </p>
      {body}
      {!loading && !error && footer}
    </section>
  );
}
