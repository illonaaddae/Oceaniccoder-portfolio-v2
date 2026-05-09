import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Settings } from "../../types";

export async function getSetting(key: string): Promise<Settings | null> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SETTINGS,
    [Query.equal("key", key)],
  );
  if (response.documents.length > 0) {
    return response.documents[0] as unknown as Settings;
  }
  return null;
}

export async function setSetting(
  key: string,
  value: string,
): Promise<Settings> {
  const existing = await getSetting(key);

  if (existing) {
    return databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SETTINGS,
      existing.$id,
      { value },
    ) as unknown as Settings;
  }

  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SETTINGS,
    ID.unique(),
    { key, value },
  ) as unknown as Settings;
}
