// The revenue ledger: money actually received, dated by when it was received.
// Definitions are in docs/plans/2026-10-12-admin-analytics-design.md §5.6.
import type { Payment } from "@/services/api/payments";
import type { Invoice } from "@/types";
import { isSuccess } from "../../Payments/paymentStatus";

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
