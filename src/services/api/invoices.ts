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

export async function createInvoice(
  invoice: Omit<Invoice, "$id" | "$createdAt" | "$updatedAt">,
): Promise<Invoice> {
  return manageCreate<Invoice>(COLLECTIONS.INVOICES, invoice);
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "$id">>,
): Promise<Invoice> {
  return manageUpdate<Invoice>(COLLECTIONS.INVOICES, id, data);
}

// No delete: invoices are archived through quoteAdmin("archiveInvoice") so
// they can be restored.
