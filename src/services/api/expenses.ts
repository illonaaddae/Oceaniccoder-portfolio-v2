import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Expense } from "../../types";

export async function getExpenses(): Promise<Expense[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.EXPENSES, [
      Query.orderDesc("date"),
      Query.limit(200),
    ]);
    return response.documents as unknown as Expense[];
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
