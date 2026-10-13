import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { listAllDocuments } from "./listAll";
import type { Expense } from "../../types";

/**
 * Every expense, latest `date` first (the old 200-row limit dropped older
 * ones). An empty list when the expenses table can't be read.
 */
export async function getExpenses(): Promise<Expense[]> {
  try {
    const rows = await listAllDocuments<Expense>(COLLECTIONS.EXPENSES);
    // listAll pages in $createdAt order; the log reads by the expense date.
    return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  } catch {
    return [];
  }
}

export async function createExpense(
  expense: Omit<Expense, "$id" | "$createdAt">,
): Promise<Expense> {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.EXPENSES,
    ID.unique(),
    expense as Record<string, unknown>,
  ) as unknown as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EXPENSES, id);
}
