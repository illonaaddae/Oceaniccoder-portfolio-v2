import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import { manageCreate, manageDelete, manageList, usesCosmos } from "./dataApi";
import type { Expense } from "../../types";

export async function getExpenses(): Promise<Expense[]> {
  try {
    const response = usesCosmos
      ? await manageList(COLLECTIONS.EXPENSES, { orderBy: "date", dir: "desc", limit: 200 })
      : await databases.listDocuments(DATABASE_ID, COLLECTIONS.EXPENSES, [
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
