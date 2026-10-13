// Pure view helpers for the Payments tab: rows, filters, search and totals.
import type { Payment } from "@/services/api/payments";
import { MOMO_NETWORKS } from "@/components/Payment/MomoNetworkPicker";
import { formatMoney, sumByCurrency, type CurrencyTotals } from "../shared/money";
import { displayStatus, isArchived, paidStageKeys, type DisplayStatus } from "./paymentStatus";

export interface PaymentRow {
  payment: Payment;
  status: DisplayStatus;
  archived: boolean;
}

/** Rows newest first. The server orders too; this keeps merged pages and local edits in order. */
export function toRows(payments: Payment[], nowMs: number): PaymentRow[] {
  const paidStages = paidStageKeys(payments);
  const newestFirst = [...payments].sort(
    (a, b) => (Date.parse(b.$createdAt) || 0) - (Date.parse(a.$createdAt) || 0),
  );
  return newestFirst.map((payment) => ({
    payment,
    status: displayStatus(payment, paidStages, nowMs),
    archived: isArchived(payment),
  }));
}

export type PaymentFilter = "all" | "paid" | "pending" | "failed" | "abandoned" | "archived";

export const FILTER_LABELS: Record<PaymentFilter, string> = {
  all: "All",
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  abandoned: "Abandoned",
  archived: "Archived",
};

/** "All" leaves out abandoned attempts and archived rows; each has its own filter. */
export function inFilter(row: PaymentRow, filter: PaymentFilter): boolean {
  if (filter === "archived") return row.archived;
  if (row.archived) return false;
  if (filter === "all") return row.status !== "abandoned";
  return row.status === filter;
}

export type MethodFilter = "all" | Payment["method"];

export const METHOD_LABEL: Record<Payment["method"], string> = {
  card: "Card",
  momo: "Mobile Money",
  bank: "Bank Transfer",
  apple_pay: "Apple Pay",
  cash: "Cash",
};

export const METHOD_OPTIONS: { value: MethodFilter; label: string }[] = [
  { value: "all", label: "All methods" },
  { value: "card", label: "Card" },
  { value: "momo", label: "Mobile Money" },
  { value: "bank", label: "Bank Transfer" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "cash", label: "Cash" },
];

const NETWORK_NOTE = "network:";

/** The Mobile Money network stored on the note at checkout ("network:mtn"). */
export function momoNetworkLabel(p: Pick<Payment, "method" | "note">): string | null {
  if (p.method !== "momo" || !p.note?.startsWith(NETWORK_NOTE)) return null;
  const id = p.note.slice(NETWORK_NOTE.length);
  return MOMO_NETWORKS.find((n) => n.id === id)?.label ?? null;
}

export function methodLabel(method: string): string {
  return (METHOD_LABEL as Record<string, string>)[method] ?? method;
}

/** Case-insensitive match on client, email, reference, invoice and quote number. */
export function matchesSearch(p: Payment, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.clientName, p.clientEmail, p.paystackReference, p.invoiceNumber, p.quoteNumber].some(
    (field) => typeof field === "string" && field.toLowerCase().includes(q),
  );
}

export { formatMoney, type CurrencyTotals };

/** Sums per currency, largest first. Mixed currencies are never added together. */
export function totalsByCurrency(payments: Payment[]): CurrencyTotals {
  return sumByCurrency(
    payments,
    (p) => p.amount,
    (p) => p.currency,
  );
}

/** When the money arrived: paidAt when recorded, else when the row was written. */
export const receivedAt = (p: Payment) => p.paidAt || p.$createdAt;

export interface PaymentKpis {
  thisMonth: CurrencyTotals;
  allTime: CurrencyTotals;
  awaitingCount: number;
  awaiting: CurrencyTotals;
  /** Paid over paid + failed + abandoned, as 0..1; null when there is nothing to rate. */
  successRate: number | null;
}

export function computeKpis(rows: PaymentRow[], now: Date): PaymentKpis {
  const live = rows.filter((r) => !r.archived);
  const paid = live.filter((r) => r.status === "paid").map((r) => r.payment);
  const pending = live.filter((r) => r.status === "pending").map((r) => r.payment);
  const thisMonth = paid.filter((p) => {
    const at = new Date(receivedAt(p));
    return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
  });
  const rated = live.filter((r) => ["paid", "failed", "abandoned"].includes(r.status)).length;
  return {
    thisMonth: totalsByCurrency(thisMonth),
    allTime: totalsByCurrency(paid),
    awaitingCount: pending.length,
    awaiting: totalsByCurrency(pending),
    successRate: rated ? paid.length / rated : null,
  };
}
