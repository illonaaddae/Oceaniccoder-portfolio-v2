import { updateMessageStatus, deleteMessage } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createMessageHandlers(loadData: LoadDataFn) {
  const handleStatusChange = async (
    messageId: string,
    status: "new" | "read" | "replied",
  ) => {
    try {
      await updateMessageStatus(messageId, status);
      await loadData(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      await loadData(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return { handleStatusChange, handleDeleteMessage };
}
