import { COLLECTIONS } from "./collections";
import {
  manageDelete,
  manageList,
  manageUpdate,
  readsAsAdmin,
  submitRow,
  type RequestOptions,
} from "./dataApi";
import type { Message } from "../../types";

/** Every message, newest first. */
export async function getMessages(): Promise<Message[]> {
  // Private rows (contact details): the read-only /dashboard shows none.
  if (!readsAsAdmin()) return [];
  const response = await manageList<Message>(COLLECTIONS.MESSAGES, {
    orderBy: "$createdAt",
    dir: "desc",
  });
  return response.documents;
}

export async function createMessage(
  message: Omit<Message, "$id" | "$createdAt">,
  turnstileToken?: string | null,
  options: RequestOptions = {},
): Promise<Message> {
  return submitRow<Message>(COLLECTIONS.MESSAGES, message, turnstileToken, {}, options);
}

export async function updateMessageStatus(
  messageId: string,
  status: "new" | "read" | "replied",
): Promise<Message> {
  return manageUpdate<Message>(COLLECTIONS.MESSAGES, messageId, { status });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await manageDelete(COLLECTIONS.MESSAGES, messageId);
}
