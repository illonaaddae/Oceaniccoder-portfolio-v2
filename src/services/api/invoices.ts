import { COLLECTIONS } from "./collections";
import { manageCreate, manageList, manageUpdate } from "./dataApi";
import type { Invoice } from "../../types";

/** Every invoice, newest first, archived ones included (callers filter on archivedAt). */
export async function getInvoices(): Promise<Invoice[]> {
  const response = await manageList<Invoice>(COLLECTIONS.INVOICES, {
    orderBy: "$createdAt",
    dir: "desc",
  });
  return response.documents;
}

/**
 * The server numbers the invoice (INV-<year>-<NNNN>) so two can never share a
 * number; use the one on the returned row for the email and pay link.
 */
export async function createInvoice(
  invoice: Omit<Invoice, "$id" | "$createdAt" | "$updatedAt" | "invoiceNumber">,
): Promise<Invoice> {
  const created = await manageCreate<Partial<Invoice>>(COLLECTIONS.INVOICES, invoice);
  if (typeof created.invoiceNumber !== "string" || !created.invoiceNumber) {
    throw new Error("The invoice was saved without a number. Reload before sending it.");
  }
  return created as Invoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "$id">>,
): Promise<Invoice> {
  return manageUpdate<Invoice>(COLLECTIONS.INVOICES, id, data);
}

// No delete: invoices are archived through quoteAdmin("archiveInvoice") so
// they can be restored.
