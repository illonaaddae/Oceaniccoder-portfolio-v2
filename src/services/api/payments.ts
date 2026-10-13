// Payments API — audit log of received money.
//
// Writes happen in TWO places:
//   1. /api/paystack-webhook (server) — gateway-initiated payments (card, momo)
//   2. InvoicesTab.handleMarkPaid (client) — admin manually marks invoice paid
//      (bank transfer, cash, etc.). method="bank" by convention.
//
// Reads: PaymentsTab in admin dashboard.
//
// Revenue in AnalyticsTab is this ledger (successful rows, dated by paidAt),
// plus paid invoices that have no payment row yet (Analytics/metrics/revenue.ts).
// Archive and restore go through quoteAdmin (/api/quote-admin), not here.
import { databases, DATABASE_ID, COLLECTIONS, ID, client } from "./client";
import { listAllDocuments } from "./listAll";

export interface PaymentRecord {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  method: "card" | "momo" | "bank" | "apple_pay" | "cash";
  paystackReference?: string;
  paidAt?: string;
  status?: "success" | "pending" | "failed" | "abandoned" | "duplicate" | "refunded";
  kind?: "invoice" | "quote";
  quoteNumber?: string;
  stageId?: string;
}

export async function createPayment(payment: PaymentRecord) {
  const data: Record<string, unknown> = {
    invoiceNumber: payment.invoiceNumber,
    clientName: payment.clientName,
    clientEmail: payment.clientEmail,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
  };
  if (payment.paystackReference) data.paystackReference = payment.paystackReference;
  if (payment.paidAt) data.paidAt = payment.paidAt;
  if (payment.status) data.status = payment.status;
  return databases.createDocument(DATABASE_ID, COLLECTIONS.PAYMENTS, ID.unique(), data);
}

/** A stored row. The fields after PaymentRecord's are set server-side, mostly on quote payments. */
export interface Payment extends PaymentRecord {
  $id: string;
  $createdAt: string;
  quoteId?: string;
  /** Exact amount in minor units; set on quote payments, absent on older rows. */
  amountMinor?: number;
  /** Free text: "network:mtn" at checkout, the failure reason, or the admin's note. */
  note?: string;
  /** Paystack's channel string, e.g. "mobile_money". */
  channel?: string;
  paystackId?: string;
  /** Admin email on manually recorded payments. */
  recordedBy?: string;
  /** Set when the admin archives the row; null or absent means not archived. */
  archivedAt?: string | null;
}

/** Every payment row, newest first (Appwrite's 25-row default dropped older ones). */
export async function getPayments(): Promise<Payment[]> {
  return listAllDocuments<Payment>(COLLECTIONS.PAYMENTS);
}

// Appwrite 1.8 (TablesDB) emits row events on the tables channel; older
// servers and documents-API writes use the collections channel. Subscribing to
// both means a webhook write is seen whichever API wrote it.
export const PAYMENTS_CHANNELS = [
  `databases.${DATABASE_ID}.collections.${COLLECTIONS.PAYMENTS}.documents`,
  `databases.${DATABASE_ID}.tables.${COLLECTIONS.PAYMENTS}.rows`,
];

/**
 * Subscribes to any create/update/delete on the payments table and invokes
 * `onChange`. Returns the unsubscribe function.
 *
 * This is what makes a webhook-written payment appear without hitting Refresh:
 * /api/paystack-webhook writes server-side, so the browser has no other way to
 * learn about it. Realtime honours collection permissions, so this only
 * delivers to an authenticated admin session. It can also fail silently, so
 * PaymentsTab polls as well.
 */
export function subscribeToPayments(onChange: () => void): () => void {
  return client.subscribe(PAYMENTS_CHANNELS, () => onChange());
}
