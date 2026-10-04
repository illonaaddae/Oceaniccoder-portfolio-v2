import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { manageCreate, manageList, manageUpdate, usesCosmos } from "./dataApi";
import { listAllDocuments } from "./listAll";
import type { Invoice } from "../../types";

/** Every invoice, newest first, archived ones included (callers filter on archivedAt). */
export async function getInvoices(): Promise<Invoice[]> {
  if (usesCosmos) {
    const response = await manageList<Invoice>(COLLECTIONS.INVOICES, {
      orderBy: "$createdAt",
      dir: "desc",
    });
    return response.documents;
  }
  return listAllDocuments<Invoice>(COLLECTIONS.INVOICES);
}

export async function createInvoice(
  invoice: Omit<Invoice, "$id" | "$createdAt" | "$updatedAt">,
): Promise<Invoice> {
  return (usesCosmos
    ? manageCreate(COLLECTIONS.INVOICES, invoice as Record<string, unknown>)
    : databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        ID.unique(),
        invoice as Record<string, unknown>,
      )) as unknown as Invoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "$id">>,
): Promise<Invoice> {
  return (usesCosmos
    ? manageUpdate(COLLECTIONS.INVOICES, id, data as Record<string, unknown>)
    : databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        id,
        data as Record<string, unknown>,
      )) as unknown as Invoice;
}

// No delete: invoices are archived through quoteAdmin("archiveInvoice") so
// they can be restored.
