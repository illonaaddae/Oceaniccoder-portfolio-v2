import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import { manageDelete, manageList, manageUpdate, submitRow, usesCosmos } from "./dataApi";
import type { ProjectInquiry } from "../../types";

export async function getInquiries(): Promise<ProjectInquiry[]> {
  const response = usesCosmos
    ? await manageList(COLLECTIONS.PROJECT_INQUIRIES, {
        orderBy: "$createdAt",
        dir: "desc",
        limit: 100,
      })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_INQUIRIES, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
  return response.documents as unknown as ProjectInquiry[];
}

export async function createInquiry(
  inquiry: Omit<ProjectInquiry, "$id" | "$createdAt" | "$updatedAt">,
  turnstileToken?: string | null,
): Promise<ProjectInquiry> {
  if (usesCosmos) {
    return submitRow<ProjectInquiry>(COLLECTIONS.PROJECT_INQUIRIES, inquiry, turnstileToken);
  }
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_INQUIRIES,
    ID.unique(),
    inquiry as Record<string, unknown>,
  ) as unknown as ProjectInquiry;
}

export async function updateInquiry(
  id: string,
  data: Partial<Omit<ProjectInquiry, "$id">>,
): Promise<ProjectInquiry> {
  return (usesCosmos
    ? manageUpdate(COLLECTIONS.PROJECT_INQUIRIES, id, data as Record<string, unknown>)
    : databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_INQUIRIES,
        id,
        data as Record<string, unknown>,
      )) as unknown as ProjectInquiry;
}

export async function deleteInquiry(id: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.PROJECT_INQUIRIES, id)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_INQUIRIES, id));
}
