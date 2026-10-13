import type React from "react";
import { formatMoney, type CurrencyTotals } from "./money";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

/** A labelled summary card; the label also names the region for screen readers. */
export function KpiCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-xl p-4" aria-label={label}>
      <h3 className="text-xs font-semibold uppercase tracking-wide" style={muted}>
        {label}
      </h3>
      {children}
    </section>
  );
}

/** One large line per currency ("0.00" when there is nothing). */
export function MoneyTotals({ totals }: { totals: CurrencyTotals }) {
  if (totals.length === 0)
    return (
      <p className="mt-1 text-xl font-bold tabular-nums" style={strong}>
        0.00
      </p>
    );
  return (
    <ul className="mt-1 space-y-0.5">
      {totals.map((t) => (
        <li key={t.currency} className="text-xl font-bold tabular-nums" style={strong}>
          {formatMoney(t.amount, t.currency)}
        </li>
      ))}
    </ul>
  );
}

/** A count headline with smaller per-currency amounts under it. */
export function CountWithTotals({
  count,
  noun,
  totals,
}: {
  count: number;
  noun: [string, string];
  totals: CurrencyTotals;
}) {
  return (
    <>
      <p className="mt-1 text-xl font-bold" style={strong}>
        {count} {count === 1 ? noun[0] : noun[1]}
      </p>
      {totals.map((t) => (
        <p key={t.currency} className="text-sm tabular-nums" style={muted}>
          {formatMoney(t.amount, t.currency)}
        </p>
      ))}
    </>
  );
}
