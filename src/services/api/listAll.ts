import { databases, DATABASE_ID, Query } from "./client";

const PAGE = 100;
// Safety cap so a runaway table can't stall the admin tab. Well above what
// the portfolio holds today; raise it (or page server-side) if it is reached.
export const LIST_ALL_CAP = 2000;

/**
 * Reads every row of a collection, newest first, by following the cursor.
 * Appwrite returns 25 rows when no limit is given and at most 100 per page,
 * so a plain listDocuments silently drops older rows.
 */
export async function listAllDocuments<T extends { $id: string }>(
  collectionId: string,
  cap = LIST_ALL_CAP,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  while (rows.length < cap) {
    const limit = Math.min(PAGE, cap - rows.length);
    const queries = [Query.orderDesc("$createdAt"), Query.limit(limit)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await databases.listDocuments(DATABASE_ID, collectionId, queries);
    const docs = page.documents as unknown as T[];
    rows.push(...docs);
    if (docs.length < limit) return rows;
    cursor = docs[docs.length - 1].$id;
  }
  // Every page came back full up to the cap, so older rows may be missing.
  console.warn(
    `listAllDocuments: stopped at ${cap} rows in "${collectionId}"; older rows may be missing.`,
  );
  return rows;
}
