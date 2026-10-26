import { COLLECTIONS } from "./collections";
import { manageCreate, manageDelete, manageList } from "./dataApi";
import type { Expense } from "../../types";

/**
 * Every expense, latest `date` first. Read errors reach the caller, so a
 * failure isn't shown as "no expenses".
 */
export async function getExpenses(): Promise<Expense[]> {
  const response = await manageList<Expense>(COLLECTIONS.EXPENSES, {
    orderBy: "date",
    dir: "desc",
  });
  return response.documents;
}

export async function createExpense(
  expense: Omit<Expense, "$id" | "$createdAt">,
): Promise<Expense> {
  return manageCreate<Expense>(COLLECTIONS.EXPENSES, expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await manageDelete(COLLECTIONS.EXPENSES, id);
}
