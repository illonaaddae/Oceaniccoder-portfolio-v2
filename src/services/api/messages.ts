import { databases, DATABASE_ID, COLLECTIONS, ID } from "./client";
import { submitRow, usesCosmos } from "./dataApi";
import { listAllDocuments } from "./listAll";
import type { Message } from "../../types";

/** Every message, newest first (Appwrite's 25-row default dropped older ones). */
export async function getMessages(): Promise<Message[]> {
  return listAllDocuments<Message>(COLLECTIONS.MESSAGES);
}

export async function createMessage(
  message: Omit<Message, "$id" | "$createdAt">,
  turnstileToken?: string | null,
): Promise<Message> {
  if (usesCosmos) return submitRow<Message>(COLLECTIONS.MESSAGES, message, turnstileToken);
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    ID.unique(),
    message as Record<string, unknown>,
  ) as unknown as Message;
}

export async function updateMessageStatus(
  messageId: string,
  status: "new" | "read" | "replied",
): Promise<Message> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId, {
    status,
  }) as unknown as Message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId);
}
