import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { ProjectInquiry } from "../../types";

export async function getInquiries(): Promise<ProjectInquiry[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_INQUIRIES, [
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return response.documents as unknown as ProjectInquiry[];
}

export async function createInquiry(
  inquiry: Omit<ProjectInquiry, "$id" | "$createdAt" | "$updatedAt">,
): Promise<ProjectInquiry> {
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
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_INQUIRIES,
    id,
    data as Record<string, unknown>,
  ) as unknown as ProjectInquiry;
}

export async function deleteInquiry(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_INQUIRIES, id);
}
