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
