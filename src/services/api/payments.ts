// Payments API — audit log of received money.
//
// Writes happen in TWO places:
//   1. /api/paystack-webhook (server) — gateway-initiated payments (card, momo)
//   2. InvoicesTab.handleMarkPaid (client) — admin manually marks invoice paid
//      (bank transfer, cash, etc.). method="bank" by convention.
//
// Reads: PaymentsTab in admin dashboard.
//
// Source of truth for revenue charts in AnalyticsTab is still the `invoices`
// collection (status === "paid"). This `payments` collection is the audit log.
import { databases, DATABASE_ID, COLLECTIONS, ID, Query, client } from "./client";
import { manageCreate, manageList, usesCosmos } from "./dataApi";

export interface PaymentRecord {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  method: "card" | "momo" | "bank" | "apple_pay";
  paystackReference?: string;
  paidAt?: string;
  status?: "success" | "pending" | "failed";
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
  return usesCosmos
    ? manageCreate(COLLECTIONS.PAYMENTS, data)
    : databases.createDocument(DATABASE_ID, COLLECTIONS.PAYMENTS, ID.unique(), data);
}

export interface Payment extends PaymentRecord {
  $id: string;
  $createdAt: string;
}

export async function getPayments(): Promise<Payment[]> {
  const response = usesCosmos
    ? await manageList(COLLECTIONS.PAYMENTS, { orderBy: "$createdAt", dir: "desc" })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, [
        Query.orderDesc("$createdAt"),
      ]);
  return response.documents as unknown as Payment[];
}

export const PAYMENTS_POLL_MS = 15000;

export const PAYMENTS_CHANNEL = `databases.${DATABASE_ID}.collections.${COLLECTIONS.PAYMENTS}.documents`;

/**
 * Subscribes to any create/update/delete on the payments collection and invokes
 * `onChange`. Returns the unsubscribe function.
 *
 * This is what makes a webhook-written payment appear without hitting Refresh:
 * /api/paystack-webhook writes server-side, so the browser has no other way to
 * learn about it. Realtime honours collection permissions, so this only
 * delivers to an authenticated admin session. With Cosmos it polls instead.
 */
export function subscribeToPayments(onChange: () => void): () => void {
  if (usesCosmos) {
    // No realtime on Cosmos: poll while the tab is visible. One admin, so
    // this is a handful of cheap reads a minute.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") onChange();
    }, PAYMENTS_POLL_MS);
    return () => window.clearInterval(timer);
  }
  return client.subscribe(PAYMENTS_CHANNEL, () => onChange());
}
