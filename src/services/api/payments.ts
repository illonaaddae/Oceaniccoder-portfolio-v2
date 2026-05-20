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
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";

export interface PaymentRecord {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  method: "card" | "momo" | "bank";
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
  return databases.createDocument(DATABASE_ID, COLLECTIONS.PAYMENTS, ID.unique(), data);
}

export interface Payment extends PaymentRecord {
  $id: string;
  $createdAt: string;
}

export async function getPayments(): Promise<Payment[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, [
    Query.orderDesc("$createdAt"),
  ]);
  return response.documents as unknown as Payment[];
}
