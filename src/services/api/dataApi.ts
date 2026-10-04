import { apiUrl } from "@/utils/apiUrl";

/**
 * Which database the site reads from. Set VITE_DATA_BACKEND=cosmos at build
 * time to read through /api/data (Cosmos DB); anything else keeps Appwrite.
 * Goes away once the Appwrite → Azure cutover is done.
 */
export const usesCosmos = import.meta.env.VITE_DATA_BACKEND === "cosmos";

export interface ListOptions {
  /** Equality filters. `$id`, `$createdAt` and `$updatedAt` work too. */
  where?: Record<string, string | number | boolean>;
  orderBy?: string;
  dir?: "asc" | "desc";
  limit?: number;
}

/** Same shape as Appwrite's listDocuments response. */
export interface DocumentList<T> {
  total: number;
  documents: T[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `GET ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** Visible rows of a public collection. */
export function listRows<T = Record<string, unknown>>(
  collection: string,
  { where, orderBy, dir, limit }: ListOptions = {},
): Promise<DocumentList<T>> {
  const params = new URLSearchParams();
  if (where && Object.keys(where).length > 0) params.set("where", JSON.stringify(where));
  if (orderBy) params.set("orderBy", orderBy);
  if (dir) params.set("dir", dir);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return getJson(`/api/data/${collection}${query ? `?${query}` : ""}`);
}

/** One row by id. Rejects if it doesn't exist or isn't public. */
export function getRow<T = Record<string, unknown>>(collection: string, id: string): Promise<T> {
  return getJson(`/api/data/${collection}/${encodeURIComponent(id)}`);
}
