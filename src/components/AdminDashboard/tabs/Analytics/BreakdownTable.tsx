import type React from "react";
import { formatMoney } from "../shared/money";
import type { BreakdownRow } from "./metrics/revenue";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

interface BreakdownTableProps {
  /** Names the table for screen readers. */
  caption: string;
  /** Header for the first column, e.g. "Method". */
  keyHeader: string;
  rows: BreakdownRow[];
  currency: string;
  /** Marks every amount as approximate (converted). */
  approx?: boolean;
  empty: string;
}

/** Label, count and amount per row, with a bar showing each row's share. */
export function BreakdownTable({
  caption,
  keyHeader,
  rows,
  currency,
  approx = false,
  empty,
}: BreakdownTableProps) {
  if (rows.length === 0)
    return (
      <p className="text-sm" style={muted}>
        {empty}
      </p>
    );
  const max = Math.max(...rows.map((r) => r.amount), 0);
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-left" style={{ borderColor: "var(--border-subtle)" }}>
          <th scope="col" className="py-2 pr-3 text-xs font-semibold uppercase" style={muted}>
            {keyHeader}
          </th>
          <th
            scope="col"
            className="py-2 pr-3 text-right text-xs font-semibold uppercase"
            style={muted}
          >
            Count
          </th>
          <th scope="col" className="py-2 text-right text-xs font-semibold uppercase" style={muted}>
            {approx ? "Amount (approx.)" : "Amount"}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <th scope="row" className="py-2 pr-3 text-left font-medium" style={strong}>
              <span className="block truncate">{r.label}</span>
              <span
                aria-hidden="true"
                className="mt-1 block h-1.5 rounded-full"
                style={{
                  width: `${max > 0 ? Math.max((r.amount / max) * 100, 2) : 0}%`,
                  background: "var(--brand-ocean-2)",
                }}
              />
            </th>
            <td className="py-2 pr-3 text-right tabular-nums" style={muted}>
              {r.count}
            </td>
            <td className="whitespace-nowrap py-2 text-right tabular-nums" style={strong}>
              {approx ? "≈ " : ""}
              {formatMoney(r.amount, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
