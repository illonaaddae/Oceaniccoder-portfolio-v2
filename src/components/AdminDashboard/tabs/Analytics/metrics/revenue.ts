// The revenue ledger: money actually received, dated by when it was received.
// Definitions are in docs/plans/2026-10-12-admin-analytics-design.md §5.6.
import type { Payment } from "@/services/api/payments";
import type { Expense, Invoice } from "@/types";
import type { QuoteSummary } from "@/types/quote";
import { isSuccess } from "../../Payments/paymentStatus";
import { quoteRows, toInvoiceRows } from "../../Invoices/invoiceView";
import { sumByCurrency, type CurrencyTotals } from "../../shared/money";
import { formatDay, toApproxGHS } from "./format";
import {
  bucketFor,
  bucketsFor,
  dayOf,
  inRange,
  rangeDays,
  shiftSpan,
  type Bucket,
  type DateRange,
} from "./range";

export interface LedgerEntry {
  id: string;
  kind: "invoice" | "quote";
  /** Major units ("500" means 500.00). */
  amount: number;
  currency: string;
  /** ISO timestamp the money arrived (paidAt, else when the row was written). */
  date: string;
  method?: Payment["method"];
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  /**
   * True for a paid invoice with no payment row: its date is the invoice's
   * last update, which is usually, but not certainly, when it was paid.
   */
  estimated: boolean;
}

/** Major units of a payment row; amountMinor is exact where it exists. */
export const paymentAmount = (p: Pick<Payment, "amount" | "amountMinor">): number =>
  Number.isInteger(p.amountMinor) ? (p.amountMinor as number) / 100 : Number(p.amount) || 0;

/**
 * Successful payment rows (invoice and quote), plus paid one-off invoices that
 * have no successful payment row, flagged as estimated. Failed, pending,
 * abandoned, duplicate and refunded rows are not revenue. Rows with no status
 * predate the field and were always successful.
 */
export function buildLedger(payments: Payment[], invoices: Invoice[]): LedgerEntry[] {
  const ledger: LedgerEntry[] = [];
  const recorded = new Set<string>();
  for (const p of payments) {
    if (!isSuccess(p)) continue;
    if (p.invoiceNumber) recorded.add(p.invoiceNumber);
    ledger.push({
      id: p.$id,
      kind: p.kind === "quote" ? "quote" : "invoice",
      amount: paymentAmount(p),
      currency: p.currency,
      date: p.paidAt || p.$createdAt,
      method: p.method,
      clientName: p.clientName ?? "",
      clientEmail: p.clientEmail ?? "",
      invoiceNumber: p.invoiceNumber ?? "",
      estimated: false,
    });
  }
  for (const inv of invoices) {
    if (inv.status !== "paid" || recorded.has(inv.invoiceNumber)) continue;
    ledger.push({
      id: inv.$id,
      kind: "invoice",
      amount: Number(inv.total) || 0,
      currency: inv.currency,
      date: inv.$updatedAt || inv.$createdAt || "",
      clientName: inv.clientName ?? "",
      clientEmail: inv.clientEmail ?? "",
      invoiceNumber: inv.invoiceNumber,
      estimated: true,
    });
  }
  return ledger;
}

/**
 * What is already recorded against a one-off invoice and what is left: the
 * successful payment rows with its number, in its currency. Marking it paid
 * records only the balance, so a part payment taken online isn't counted twice.
 */
export function invoiceBalance(
  inv: Pick<Invoice, "invoiceNumber" | "total" | "currency">,
  payments: Payment[],
): { paid: number; balance: number } {
  const cents = payments
    .filter((p) => p.invoiceNumber === inv.invoiceNumber && p.currency === inv.currency)
    .filter(isSuccess)
    .reduce((sum, p) => sum + Math.round(paymentAmount(p) * 100), 0);
  const totalCents = Math.round((Number(inv.total) || 0) * 100);
  return { paid: cents / 100, balance: Math.max(totalCents - cents, 0) / 100 };
}

// ---------------------------------------------------------------------------
// KPIs over the ledger, outstanding invoices and expenses. Money is never
// added across currencies except in the "approx." GHS unit.

/** What the charts and breakdowns show: one currency, or everything in approx. GHS. */
export type MoneyUnit = { kind: "currency"; currency: string } | { kind: "approx" };

/** An amount in the unit, or null when it doesn't belong (another currency, or no rate). */
export function amountIn(unit: MoneyUnit, amount: number, currency: string): number | null {
  if (unit.kind === "approx") return toApproxGHS(amount, currency);
  return currency === unit.currency ? amount : null;
}

export const unitCurrency = (unit: MoneyUnit) => (unit.kind === "approx" ? "GHS" : unit.currency);

/** Ledger entries whose money arrived within the range. */
export const entriesIn = (ledger: LedgerEntry[], r: DateRange) =>
  ledger.filter((e) => inRange(dayOf(e.date), r));

export const cashByCurrency = (entries: LedgerEntry[]): CurrencyTotals =>
  sumByCurrency(
    entries,
    (e) => e.amount,
    (e) => e.currency,
  );

/** Paid invoices with no payment row, whose date is a guess. */
export const estimatedCount = (ledger: LedgerEntry[]) => ledger.filter((e) => e.estimated).length;

/**
 * The currency with the most revenue in the range, else across all time, else
 * GHS. Totals in different currencies are compared at the approx. rates.
 */
export function defaultCurrency(ledger: LedgerEntry[], r: DateRange): string {
  const pick = (entries: LedgerEntry[]) => {
    let best: { currency: string; value: number } | null = null;
    for (const t of cashByCurrency(entries)) {
      const value = toApproxGHS(t.amount, t.currency) ?? t.amount;
      if (!best || value > best.value) best = { currency: t.currency, value };
    }
    return best?.currency ?? null;
  };
  return pick(entriesIn(ledger, r)) ?? pick(ledger) ?? "GHS";
}

export interface CashPoint {
  key: string;
  label: string;
  from: string;
  to: string;
  invoice: number;
  quote: number;
  total: number;
  /** The same slot of the previous period. */
  previous: number;
}

/** Cash collected per bucket, split by kind, with the previous period lined up. */
export function cashSeries(
  ledger: LedgerEntry[],
  r: DateRange,
  unit: MoneyUnit,
  bucket: Bucket = bucketFor(r),
): CashPoint[] {
  const n = rangeDays(r);
  const dated = ledger
    .map((e) => ({ e, day: dayOf(e.date), value: amountIn(unit, e.amount, e.currency) }))
    .filter(
      (x): x is { e: LedgerEntry; day: string; value: number } => !!x.day && x.value !== null,
    );
  return bucketsFor(r, bucket).map((span) => {
    const prev = shiftSpan(span, n);
    const point: CashPoint = { ...span, invoice: 0, quote: 0, total: 0, previous: 0 };
    for (const { e, day, value } of dated) {
      if (inRange(day, span)) {
        point[e.kind] += value;
        point.total += value;
      } else if (inRange(day, prev)) point.previous += value;
    }
    return point;
  });
}

export interface CurrencyStats {
  currency: string;
  count: number;
  total: number;
  average: number;
}

/** Count, total and mean payment per currency, largest total first. */
export function paymentStats(entries: LedgerEntry[]): CurrencyStats[] {
  return cashByCurrency(entries).map(({ currency, amount }) => {
    const count = entries.filter((e) => e.currency === currency).length;
    return { currency, count, total: amount, average: count ? amount / count : 0 };
  });
}

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  amount: number;
}

function breakdown(
  items: { key: string; label: string; amount: number; currency: string }[],
  unit: MoneyUnit,
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();
  for (const item of items) {
    const value = amountIn(unit, item.amount, item.currency);
    if (value === null) continue;
    const row = rows.get(item.key) ?? { key: item.key, label: item.label, count: 0, amount: 0 };
    row.count += 1;
    row.amount += value;
    rows.set(item.key, row);
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

export const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  momo: "Mobile Money",
  bank: "Bank transfer",
  apple_pay: "Apple Pay",
  cash: "Cash",
};

export type MethodTone = "card" | "momo" | "bank" | "apple" | "other";

/** The icon and colour for a byMethod key; cash, "unknown" and anything new share "other". */
export function methodTone(key: string): MethodTone {
  if (key === "card" || key === "momo" || key === "bank") return key;
  return key === "apple_pay" ? "apple" : "other";
}

/** Money by payment method. Estimated invoices have no method: "Not recorded". */
export const byMethod = (entries: LedgerEntry[], unit: MoneyUnit) =>
  breakdown(
    entries.map((e) => ({
      key: e.method ?? "unknown",
      label: e.method ? (METHOD_LABELS[e.method] ?? e.method) : "Not recorded",
      amount: e.amount,
      currency: e.currency,
    })),
    unit,
  );

/** The biggest clients by money received, keyed by email (or name when there is none). */
export function topClients(entries: LedgerEntry[], unit: MoneyUnit, limit = 10): BreakdownRow[] {
  return breakdown(
    entries.map((e) => {
      const email = e.clientEmail.trim().toLowerCase();
      return {
        key: email || `name:${e.clientName.trim().toLowerCase()}`,
        label: e.clientName.trim() || email || "Unnamed client",
        amount: e.amount,
        currency: e.currency,
      };
    }),
    unit,
  ).slice(0, limit);
}

export interface OutstandingItem {
  key: string;
  number: string;
  clientName: string;
  currency: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  overdue: boolean;
  /** Whole days since the invoice was issued; null when the issue date is unknown. */
  ageDays: number | null;
  /** Whole days until it falls due, negative once past; null with no due date. */
  dueInDays: number | null;
  source: "oneoff" | "quote";
}

export interface OutstandingSummary {
  items: OutstandingItem[];
  totals: CurrencyTotals;
  overdueCount: number;
  overdue: CurrencyTotals;
}

/**
 * What clients owe now: sent one-off invoices that aren't archived, plus
 * requested quote stages. The same rows the Invoices tab counts as due or
 * overdue. Overdue first, then oldest first.
 */
export function outstandingSummary(
  invoices: Invoice[],
  quotes: QuoteSummary[],
  now: Date,
): OutstandingSummary {
  const today = dayOf(now.toISOString()) as string;
  const items: OutstandingItem[] = toInvoiceRows(invoices, quoteRows(quotes), now)
    .filter((r) => !r.archived && (r.status === "due" || r.status === "overdue"))
    .map((r) => {
      const issued = dayOf(r.issuedAt);
      const due = dayOf(r.dueAt);
      const dueInDays = due ? rangeDays({ from: today, to: due }) - 1 : null;
      return {
        key: r.key,
        number: r.number,
        clientName: r.clientName,
        currency: r.currency,
        amount: r.amount,
        issuedAt: r.issuedAt,
        dueAt: r.dueAt,
        // A quote stage's flag comes from the server and can lag its due date;
        // a passed due date (in UTC days, Ghana's) counts as overdue either way.
        overdue: r.status === "overdue" || (dueInDays !== null && dueInDays < 0),
        ageDays: issued ? rangeDays({ from: issued, to: today }) - 1 : null,
        dueInDays,
        source: r.kind,
      };
    })
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (b.ageDays ?? -1) - (a.ageDays ?? -1));
  const totals = (rows: OutstandingItem[]) =>
    sumByCurrency(
      rows,
      (r) => r.amount,
      (r) => r.currency,
    );
  const overdue = items.filter((i) => i.overdue);
  return {
    items,
    totals: totals(items),
    overdueCount: overdue.length,
    overdue: totals(overdue),
  };
}

const DUE_SOON_DAYS = 7;

export interface OwedStatus {
  kind: "overdue" | "due" | "sent";
  label: string;
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * Overdue, due within a week, or simply sent, worded for a status pill. A due
 * date in the past reads as overdue even when the row isn't flagged overdue.
 */
export function owedStatus(
  item: Pick<OutstandingItem, "overdue" | "dueInDays" | "issuedAt">,
): OwedStatus {
  const d = item.dueInDays;
  if (item.overdue || (d !== null && d < 0))
    return { kind: "overdue", label: d !== null && d < 0 ? `Overdue ${days(-d)}` : "Overdue" };
  if (d !== null && d >= 0 && d <= DUE_SOON_DAYS)
    return { kind: "due", label: d === 0 ? "Due today" : `Due in ${days(d)}` };
  const issued = dayOf(item.issuedAt);
  return { kind: "sent", label: issued ? `Sent ${formatDay(issued)}` : "Sent" };
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  domain: "Domain",
  hosting: "Hosting",
  tools: "Tools",
  software: "Software",
  other: "Other",
};

/** Expenses whose `date` falls within the range. */
export const expensesIn = (expenses: Expense[], r: DateRange) =>
  expenses.filter((e) => inRange(dayOf(e.date), r));

export const expenseTotals = (expenses: Expense[]): CurrencyTotals =>
  sumByCurrency(
    expenses,
    (e) => e.amount,
    (e) => e.currency,
  );

export interface AmountPoint {
  key: string;
  label: string;
  from: string;
  to: string;
  amount: number;
  previous: number;
}

/** Expenses per bucket in one unit, with the previous period lined up. */
export function expenseSeries(
  expenses: Expense[],
  r: DateRange,
  unit: MoneyUnit,
  bucket: Bucket = bucketFor(r),
): AmountPoint[] {
  const n = rangeDays(r);
  return bucketsFor(r, bucket).map((span) => {
    const prev = shiftSpan(span, n);
    const point: AmountPoint = { ...span, amount: 0, previous: 0 };
    for (const e of expenses) {
      const day = dayOf(e.date);
      const value = amountIn(unit, Number(e.amount) || 0, e.currency);
      if (value === null) continue;
      if (inRange(day, span)) point.amount += value;
      else if (inRange(day, prev)) point.previous += value;
    }
    return point;
  });
}

/**
 * The biggest expenses in the range, each in its own currency. Currencies are
 * compared at the approx. rates; one with no rate is compared as it stands.
 */
export function largestExpenses(expenses: Expense[], r: DateRange, limit = 3): Expense[] {
  const size = (e: Expense) => {
    const amount = Number(e.amount) || 0;
    return toApproxGHS(amount, e.currency) ?? amount;
  };
  return [...expensesIn(expenses, r)].sort((a, b) => size(b) - size(a)).slice(0, limit);
}

export const expensesByCategory = (expenses: Expense[], unit: MoneyUnit) =>
  breakdown(
    expenses.map((e) => ({
      key: e.category,
      label: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
      amount: Number(e.amount) || 0,
      currency: e.currency,
    })),
    unit,
  );

/** Cash collected minus expenses, per currency; never across currencies. */
export function netByCurrency(cash: CurrencyTotals, spent: CurrencyTotals): CurrencyTotals {
  const net = new Map<string, number>();
  for (const c of cash) net.set(c.currency, (net.get(c.currency) ?? 0) + c.amount);
  for (const s of spent) net.set(s.currency, (net.get(s.currency) ?? 0) - s.amount);
  return [...net.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount || a.currency.localeCompare(b.currency));
}

/** A total in one unit, for deltas: a currency's own amount, or the approx. GHS sum. */
export function totalIn(unit: MoneyUnit, totals: CurrencyTotals): number {
  return totals.reduce((sum, t) => sum + (amountIn(unit, t.amount, t.currency) ?? 0), 0);
}
