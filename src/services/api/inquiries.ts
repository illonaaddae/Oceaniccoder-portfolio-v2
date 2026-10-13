import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { submitRow, usesCosmos } from "./dataApi";
import { listAllDocuments } from "./listAll";
import type { ProjectInquiry } from "../../types";

/** Every inquiry, newest first (the old 100-row limit dropped older ones). */
export async function getInquiries(): Promise<ProjectInquiry[]> {
  return listAllDocuments<ProjectInquiry>(COLLECTIONS.PROJECT_INQUIRIES);
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
