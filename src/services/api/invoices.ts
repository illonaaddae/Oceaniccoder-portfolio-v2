import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { listAllDocuments } from "./listAll";
import type { Invoice } from "../../types";

/** Every invoice, newest first, archived ones included (callers filter on archivedAt). */
export async function getInvoices(): Promise<Invoice[]> {
  return listAllDocuments<Invoice>(COLLECTIONS.INVOICES);
}

export async function createInvoice(
  invoice: Omit<Invoice, "$id" | "$createdAt" | "$updatedAt">,
): Promise<Invoice> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    ID.unique(),
    invoice as Record<string, unknown>,
  ) as unknown as Invoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "$id">>,
): Promise<Invoice> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    id,
    data as Record<string, unknown>,
  ) as unknown as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICES, id);
}
