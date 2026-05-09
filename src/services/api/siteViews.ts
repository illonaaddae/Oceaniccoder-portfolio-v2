import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";

export interface SiteView {
  $id: string;
  count: number;
  lastUpdated: string;
}

export async function getSiteViews(): Promise<number> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SITE_VIEWS,
      [Query.limit(1)],
    );
    if (response.documents.length > 0) {
      return (response.documents[0] as unknown as SiteView).count || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function incrementSiteViews(): Promise<number> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SITE_VIEWS,
      [Query.limit(1)],
    );
    if (response.documents.length > 0) {
      const doc = response.documents[0] as unknown as SiteView;
      const newCount = (doc.count || 0) + 1;
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.SITE_VIEWS,
        doc.$id,
        { count: newCount, lastUpdated: new Date().toISOString() },
      );
      return newCount;
    }
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SITE_VIEWS,
      ID.unique(),
      { count: 1, lastUpdated: new Date().toISOString() },
    );
    return 1;
  } catch {
    return 0;
  }
}
