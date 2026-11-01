// Projections for savings goals. Contributions only: no interest or returns
// are ever assumed, so a projection is the floor of what the plan delivers.
//
// `savedThisMonth` is what already went into the fund this month. The balance
// includes it, so only the rest of this month's contribution is still to
// come; without this, every on-time deposit would be counted twice and make a
// goal look healthier than it is.
import { addMonths, monthsBetween } from "./ledger";

/** What is still to come this month, after what was already saved. */
const leftThisMonth = (monthly: number, savedThisMonth: number) =>
  Math.max(0, monthly - Math.max(0, savedThisMonth));

/**
 * Months, counting this one, until `balance` reaches `target`; 0 when it
 * already has, null if it never will.
 */
export function monthsToTarget(
  balance: number,
  monthly: number,
  target: number,
  savedThisMonth = 0,
): number | null {
  if (target <= 0) return null;
  const need = target - balance;
  if (need <= 0) return 0;
  if (monthly <= 0) return null;
  const now = leftThisMonth(monthly, savedThisMonth);
  if (now >= need) return 1;
  return 1 + Math.ceil((need - now) / monthly);
}

/** The month a goal is reached at this pace, or null if it never will be. */
export function projectedMonth(
  balance: number,
  monthly: number,
  target: number,
  month: string,
  savedThisMonth = 0,
): string | null {
  const n = monthsToTarget(balance, monthly, target, savedThisMonth);
  if (n === null) return null;
  return n === 0 ? month : addMonths(month, n - 1);
}

/**
 * Months that can still contribute before a goal's date: this month and every
 * month up to, but not including, the target month. Salary may arrive after a
 * date early in that month (rent due on the 1st), so it is never counted on.
 * Null when there is no date or the target month has passed.
 */
function monthsBefore(targetDate: string, month: string): number | null {
  if (!targetDate) return null;
  const months = monthsBetween(month, targetDate.slice(0, 7));
  return months < 0 ? null : months;
}

/**
 * Monthly saving needed to reach `target` by `targetDate`. Once something
 * went in this month, this month no longer counts as one still to fund. With
 * no months left it is the whole remaining amount. Null with no date or past it.
 */
export function neededPerMonth(
  balance: number,
  target: number,
  targetDate: string,
  month: string,
  savedThisMonth = 0,
): number | null {
  const before = monthsBefore(targetDate, month);
  if (before === null || target <= 0) return null;
  const months = savedThisMonth > 0 ? before - 1 : before;
  const remaining = Math.max(0, target - balance);
  return months <= 0 ? remaining : Math.ceil(remaining / months);
}

/**
 * How much a goal will be short on its date if `monthly` keeps going in for
 * every month before it. 0 when it will be met; null with no date, or past it.
 */
export function shortfallByDate(
  balance: number,
  monthly: number,
  target: number,
  targetDate: string,
  month: string,
  savedThisMonth = 0,
): number | null {
  const months = monthsBefore(targetDate, month);
  if (months === null || target <= 0) return null;
  const toCome = months === 0 ? 0 : leftThisMonth(monthly, savedThisMonth) + monthly * (months - 1);
  return Math.max(0, target - (balance + toCome));
}

/**
 * Balance today, then at the end of each of the next `months` months: the
 * rest of this month's contribution first, then `monthly` each month.
 */
export function contributionSeries(
  balance: number,
  monthly: number,
  months: number,
  savedThisMonth = 0,
): number[] {
  const first = leftThisMonth(monthly, savedThisMonth);
  return Array.from({ length: months + 1 }, (_, i) =>
    i === 0 ? balance : balance + first + monthly * (i - 1),
  );
}

/** Progress toward a target, clamped to 0..1; 0 when there is no target. */
export function progress(balance: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, balance / target));
}
