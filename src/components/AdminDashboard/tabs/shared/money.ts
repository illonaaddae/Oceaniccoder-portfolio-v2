// Money helpers shared by the Payments and Invoices tabs. Amounts are major
// units ("500" means GHS 500.00) and are never added across currencies.
import { formatMinor } from "@/utils/quoteMath";

/** "GHS 1,250.00", the same format as the quote screens. */
export function formatMoney(amount: number, currency: string): string {
  return formatMinor(Math.round((Number(amount) || 0) * 100), currency || "");
}

export type CurrencyTotals = { currency: string; amount: number }[];

/** Sums per currency, largest first. */
export function sumByCurrency<T>(
  items: T[],
  amountOf: (item: T) => number,
  currencyOf: (item: T) => string | undefined,
): CurrencyTotals {
  const sums = new Map<string, number>();
  for (const item of items) {
    const currency = currencyOf(item) || "—";
    sums.set(currency, (sums.get(currency) ?? 0) + (Number(amountOf(item)) || 0));
  }
  return [...sums.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount || a.currency.localeCompare(b.currency));
}
