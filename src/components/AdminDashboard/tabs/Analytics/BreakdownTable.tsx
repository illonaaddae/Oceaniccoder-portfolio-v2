import type React from "react";
import type { IconType } from "react-icons";
import { FaApple, FaCreditCard, FaMobileAlt, FaUniversity, FaWallet } from "react-icons/fa";
import { formatMoney } from "../shared/money";
import { initials } from "./metrics/format";
import { methodTone, type BreakdownRow, type MethodTone } from "./metrics/revenue";

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
              <span className="block [overflow-wrap:anywhere] sm:truncate">{r.label}</span>
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

const METHOD_ICONS: Record<MethodTone, IconType> = {
  card: FaCreditCard,
  momo: FaMobileAlt,
  bank: FaUniversity,
  apple: FaApple,
  other: FaWallet,
};

const methodColor = (key: string) => `var(--method-${methodTone(key)})`;

const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

const DONUT_R = 46;
const DONUT_GAP = 2;

/** Payment methods as a donut (payment count in the middle) and a list with icon tiles. */
export function MethodBreakdown({
  rows,
  currency,
  approx = false,
}: {
  rows: BreakdownRow[];
  currency: string;
  approx?: boolean;
}) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const count = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.amount), 0);
  const circumference = 2 * Math.PI * DONUT_R;
  // One method fills the ring; a gap would only cut a notch in it.
  const gap = rows.length > 1 ? DONUT_GAP : 0;
  let offset = 0;
  return (
    <div className="grid grid-cols-1 items-center gap-4 min-[400px]:grid-cols-[120px_minmax(0,1fr)]">
      <svg viewBox="0 0 120 120" className="mx-auto h-[120px] w-[120px]" focusable="false">
        {rows.map((r) => {
          const length = share(r.amount, total) * (circumference / 100);
          const arc = (
            <circle
              key={r.key}
              cx="60"
              cy="60"
              r={DONUT_R}
              fill="none"
              stroke={methodColor(r.key)}
              strokeWidth="16"
              strokeDasharray={`${Math.max(length - gap, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return arc;
        })}
        <text
          x="60"
          y="60"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fill="var(--text-primary)"
          className="tabular-nums"
        >
          {count}
        </text>
        <text x="60" y="76" textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
          {count === 1 ? "payment" : "payments"}
        </text>
      </svg>
      <ul className="grid gap-3">
        {rows.map((r) => {
          const Icon = METHOD_ICONS[methodTone(r.key)];
          return (
            <li
              key={r.key}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5"
              data-method={methodTone(r.key)}
            >
              <span
                className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-white"
                style={{ background: methodColor(r.key) }}
              >
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="flex justify-between gap-2 text-sm font-bold" style={strong}>
                  <span className="min-w-0 [overflow-wrap:anywhere] sm:truncate">{r.label}</span>
                  <span className="text-xs font-medium tabular-nums" style={muted}>
                    {r.count}
                  </span>
                </span>
                <span
                  className="mt-1 block h-1.5 overflow-hidden rounded-full"
                  style={{ background: "var(--analytics-line-soft)" }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${share(r.amount, max)}%`, background: methodColor(r.key) }}
                  />
                </span>
              </span>
              <span className="text-right text-sm font-bold tabular-nums" style={strong}>
                {Math.round(share(r.amount, total))}%
                <span className="block text-xs font-medium" style={muted}>
                  {approx ? "≈ " : ""}
                  {formatMoney(r.amount, currency)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Initials in a circle; decorative, the name is always written next to it. */
export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        fontSize: size < 32 ? 11 : 13,
        background: "var(--accent-teal-subtle)",
        color: "var(--text-primary)",
      }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Rows as a list, each with its share of the largest as a bar: clients with
 * an avatar, or categories without.
 */
export function ShareList({
  rows,
  currency,
  approx = false,
  avatars = false,
  noun,
  empty,
}: {
  rows: BreakdownRow[];
  currency: string;
  approx?: boolean;
  avatars?: boolean;
  /** What a count is of, e.g. ["payment", "payments"]. */
  noun: [string, string];
  empty: string;
}) {
  if (rows.length === 0)
    return (
      <p className="text-sm" style={muted}>
        {empty}
      </p>
    );
  const max = Math.max(...rows.map((r) => r.amount), 0);
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li
          key={r.key}
          className={`grid items-center gap-2.5 ${avatars ? "grid-cols-[34px_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
        >
          {avatars && <Avatar name={r.label} />}
          <span className="min-w-0">
            <span className="flex justify-between gap-2 text-sm font-bold" style={strong}>
              <span className="min-w-0 [overflow-wrap:anywhere] sm:truncate">{r.label}</span>
              <span className="whitespace-nowrap text-xs font-medium tabular-nums" style={muted}>
                {r.count} {r.count === 1 ? noun[0] : noun[1]}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-1 block h-1.5 overflow-hidden rounded-full"
              style={{ background: "var(--analytics-line-soft)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(share(r.amount, max), 2)}%`,
                  background: "var(--brand-ocean-2)",
                }}
              />
            </span>
          </span>
          <span
            className="whitespace-nowrap text-right text-sm font-bold tabular-nums"
            style={strong}
          >
            {approx ? "≈ " : ""}
            {formatMoney(r.amount, currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
