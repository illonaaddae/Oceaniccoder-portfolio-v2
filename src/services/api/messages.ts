import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import { manageDelete, manageList, manageUpdate, submitRow, usesCosmos } from "./dataApi";
import type { Message } from "../../types";

export async function getMessages(): Promise<Message[]> {
  const response = usesCosmos
    ? await manageList(COLLECTIONS.MESSAGES, { orderBy: "$createdAt", dir: "desc" })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
        Query.orderDesc("$createdAt"),
      ]);
  return response.documents as unknown as Message[];
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
  return (usesCosmos
    ? manageUpdate(COLLECTIONS.MESSAGES, messageId, {
        status,
      })
    : databases.updateDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId, {
        status,
      })) as unknown as Message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.MESSAGES, messageId)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId));
}
