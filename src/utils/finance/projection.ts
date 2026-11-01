// Projections for savings goals. Contributions only: no interest or returns
// are ever assumed, so a projection is the floor of what the plan delivers.
import { addMonths, monthsBetween } from "./ledger";

/** Months of saving `monthly` until `balance` reaches `target`; null if it never will. */
export function monthsToTarget(balance: number, monthly: number, target: number): number | null {
  if (target <= 0) return null;
  if (balance >= target) return 0;
  if (monthly <= 0) return null;
  return Math.ceil((target - balance) / monthly);
}

/**
 * The month a goal is reached when this month's contribution is still to come.
 * Reaching it with `n` more contributions lands in month + n − 1.
 */
export function projectedMonth(
  balance: number,
  monthly: number,
  target: number,
  month: string,
): string | null {
  const n = monthsToTarget(balance, monthly, target);
  if (n === null) return null;
  return n === 0 ? month : addMonths(month, n - 1);
}

/**
 * Monthly saving needed to reach `target` by the month of `targetDate`,
 * counting this month. Null when there is no date or the date has passed.
 */
export function neededPerMonth(
  balance: number,
  target: number,
  targetDate: string,
  month: string,
): number | null {
  if (!targetDate || target <= 0) return null;
  const months = monthsBetween(month, targetDate.slice(0, 7)) + 1;
  if (months <= 0) return null;
  return Math.max(0, Math.ceil((target - balance) / months));
}

/** Balance after each of the next `months` contributions, starting with today's. */
export function contributionSeries(balance: number, monthly: number, months: number): number[] {
  return Array.from({ length: months + 1 }, (_, i) => balance + monthly * i);
}

/** Progress toward a target, clamped to 0..1; 0 when there is no target. */
export function progress(balance: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, balance / target));
}
