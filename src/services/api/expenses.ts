import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { manageCreate, manageDelete, manageList, usesCosmos } from "./dataApi";
import { listAllDocuments } from "./listAll";
import type { Expense } from "../../types";

/**
 * Every expense, latest `date` first (the old 200-row limit dropped older
 * ones). Read errors reach the caller, so a failure isn't shown as "no expenses".
 */
export async function getExpenses(): Promise<Expense[]> {
  if (usesCosmos) {
    const response = await manageList<Expense>(COLLECTIONS.EXPENSES, {
      orderBy: "date",
      dir: "desc",
    });
    return response.documents;
  }
  const rows = await listAllDocuments<Expense>(COLLECTIONS.EXPENSES);
  // listAll pages in $createdAt order; the log reads by the expense date.
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function createExpense(
  expense: Omit<Expense, "$id" | "$createdAt">,
): Promise<Expense> {
  return (usesCosmos
    ? manageCreate(COLLECTIONS.EXPENSES, expense as Record<string, unknown>)
    : databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.EXPENSES,
        ID.unique(),
        expense as Record<string, unknown>,
      )) as unknown as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.EXPENSES, id)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.EXPENSES, id));
}
