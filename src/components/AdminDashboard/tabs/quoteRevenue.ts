import type { Payment } from "@/services/api/payments";
import type { Invoice } from "@/types";

/**
 * Revenue charts read paid invoices. Quote stages are paid without an invoice
 * row, so successful quote payments are mapped into the same shape and merged.
 */
export function quotePaymentsAsRevenue(payments: Payment[]): Invoice[] {
  return payments
    .filter((p) => p.kind === "quote" && p.status === "success")
    .map(
      (p) =>
        ({
          $id: p.$id,
          invoiceNumber: p.invoiceNumber,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          items: "[]",
          currency: p.currency,
          subtotal: p.amount,
          tax: 0,
          total: p.amount,
          status: "paid",
          $createdAt: p.paidAt || p.$createdAt,
        }) as unknown as Invoice,
    );
}
