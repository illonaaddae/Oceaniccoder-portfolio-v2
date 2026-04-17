import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Message } from "../../types";

export async function getMessages(): Promise<Message[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    [Query.orderDesc("$createdAt")],
  );
  return response.documents as unknown as Message[];
}

export async function createMessage(
  message: Omit<Message, "$id" | "$createdAt">,
): Promise<Message> {
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
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    messageId,
    { status },
  ) as unknown as Message;
}

export async function deleteMessage(messageId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, messageId);
}
