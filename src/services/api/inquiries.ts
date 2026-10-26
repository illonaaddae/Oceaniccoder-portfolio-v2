import { COLLECTIONS } from "./collections";
import { manageDelete, manageList, manageUpdate, readsAsAdmin, submitRow } from "./dataApi";
import type { ProjectInquiry } from "../../types";

/** Every inquiry, newest first (the old 100-row limit dropped older ones). */
export async function getInquiries(): Promise<ProjectInquiry[]> {
  // Private rows (contact details): the read-only /dashboard shows none.
  if (!readsAsAdmin()) return [];
  const response = await manageList<ProjectInquiry>(COLLECTIONS.PROJECT_INQUIRIES, {
    orderBy: "$createdAt",
    dir: "desc",
  });
  return response.documents;
}

export async function createInquiry(
  inquiry: Omit<ProjectInquiry, "$id" | "$createdAt" | "$updatedAt">,
  turnstileToken?: string | null,
): Promise<ProjectInquiry> {
  return submitRow<ProjectInquiry>(COLLECTIONS.PROJECT_INQUIRIES, inquiry, turnstileToken);
}

export async function updateInquiry(
  id: string,
  data: Partial<Omit<ProjectInquiry, "$id">>,
): Promise<ProjectInquiry> {
  return manageUpdate<ProjectInquiry>(COLLECTIONS.PROJECT_INQUIRIES, id, data);
}

export async function deleteInquiry(id: string): Promise<void> {
  await manageDelete(COLLECTIONS.PROJECT_INQUIRIES, id);
}
