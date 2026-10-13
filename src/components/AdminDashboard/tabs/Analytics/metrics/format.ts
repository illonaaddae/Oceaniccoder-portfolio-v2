// Display formatting for the Analytics tab. Money in a single currency uses
// the shared formatMoney ("GHS 1,250.00"); a converted figure is always
// marked approximate.
import { FX_RATES } from "@/config/fxRates";
import { formatMoney, type CurrencyTotals } from "../../shared/money";
import type { DateRange, Delta } from "./range";

export const APPROX = "approx";

/** The figure in GHS at the configured rates, or null for an unknown currency. */
export function toApproxGHS(
  amount: number,
  currency: string,
  rates: Record<string, number> = FX_RATES.toGHS,
): number | null {
  const rate = rates[currency];
  return typeof rate === "number" && Number.isFinite(rate) ? amount * rate : null;
}

/** Per-currency totals combined in GHS, plus the currencies that had no rate. */
export function approxTotal(
  totals: CurrencyTotals,
  rates: Record<string, number> = FX_RATES.toGHS,
): { amount: number; missing: string[] } {
  let amount = 0;
  const missing: string[] = [];
  for (const t of totals) {
    const ghs = toApproxGHS(t.amount, t.currency, rates);
    if (ghs === null) missing.push(t.currency);
    else amount += ghs;
  }
  return { amount, missing };
}

/** "≈ GHS 1,250.00 approx." */
export const formatApproxGHS = (amount: number) => `≈ ${formatMoney(amount, "GHS")} ${APPROX}.`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "13 Oct 2026" from "2026-10-13"; the input back when it isn't a date. */
export function formatDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "14 Sep – 13 Oct", with the years only when either end falls outside `year`. */
export function formatSpan(r: DateRange, year: string): string {
  const inYear = r.from.startsWith(year) && r.to.startsWith(year);
  const day = (d: string) => (inYear ? formatDay(d).replace(/ \d{4}$/, "") : formatDay(d));
  return `${day(r.from)} – ${day(r.to)}`;
}

/** Up to two initials for an avatar, e.g. "AO" for "Ama Owusu"; "?" for a blank name. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase());
  return letters.join("") || "?";
}

/** "at rates as of 13 Oct 2026". */
export const ratesNote = () => `at rates as of ${formatDay(FX_RATES.asOf)}`;

/** "+12%", "−5%", "New" or "–" (no change to report). */
export function formatDelta(d: Delta): string {
  if (d.kind === "none") return "–";
  if (d.kind === "new") return "New";
  const pct = Math.round(d.ratio * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

/** Screen-reader wording for a delta, e.g. "up 12% on the previous period". */
export function describeDelta(d: Delta): string {
  if (d.kind === "none") return "nothing in either period";
  if (d.kind === "new") return "none in the previous period";
  const pct = Math.abs(Math.round(d.ratio * 100));
  if (pct === 0) return "the same as the previous period";
  return `${d.ratio > 0 ? "up" : "down"} ${pct}% on the previous period`;
}

/** Short axis labels: 950, 1.2k, 3.4M. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}
