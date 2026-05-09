import { useState } from "react";
import type { DeleteConfirmState } from "./types";

const READONLY_MSG =
  "This feature is for admin only. You are viewing in read-only mode.";
const EMPTY_STATE: DeleteConfirmState = { show: false, type: null, id: null };

export function useDeleteConfirm(
  isReadOnly: boolean,
  showError: (msg: string) => void,
  showSuccess: (msg: string) => void,
  handleDeleteMessage: (id: string) => Promise<void>,
  handleDeleteSkill: (id: string) => Promise<void>,
  handleStatusChange: (
    id: string,
    status: "new" | "read" | "replied",
  ) => Promise<void>,
  loadData: (showLoader?: boolean) => Promise<void>,
) {
  const [deleteConfirm, setDeleteConfirm] =
    useState<DeleteConfirmState>(EMPTY_STATE);

  const handleMessageStatusChange = async (
    messageId: string,
    status: "new" | "read" | "replied",
  ) => {
    if (isReadOnly) {
      showError(READONLY_MSG);
      return;
    }
    try {
      await handleStatusChange(messageId, status);
      const msgs: Record<string, string> = {
        new: "Message marked as new",
        read: "Message marked as read",
        replied: "Message marked as replied",
      };
      showSuccess(msgs[status] || "Message status updated");
    } catch (err) {
      console.error("Failed to update message status:", err);
      showError("Failed to update message status");
    }
  };

  const requestDeleteMessage = (messageId: string) => {
    if (isReadOnly) {
      showError(READONLY_MSG);
      return;
    }
    setDeleteConfirm({ show: true, type: "message", id: messageId });
  };

  const requestDeleteSkill = (skillId: string, skillName?: string) => {
    if (isReadOnly) {
      showError(READONLY_MSG);
      return;
    }
    setDeleteConfirm({
      show: true,
      type: "skill",
      id: skillId,
      name: skillName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;
    try {
      if (deleteConfirm.type === "message") {
        await handleDeleteMessage(deleteConfirm.id);
        showSuccess("Message deleted successfully!");
      } else if (deleteConfirm.type === "skill") {
        await handleDeleteSkill(deleteConfirm.id);
        showSuccess("Skill deleted successfully!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("could not be found")) {
        showSuccess("Item was already deleted. Refreshing data...");
        await loadData(false);
      } else {
        showError(`Failed to delete: ${msg}`);
      }
    } finally {
      setDeleteConfirm(EMPTY_STATE);
    }
  };

  const cancelDelete = () => setDeleteConfirm(EMPTY_STATE);

  return {
    deleteConfirm,
    handleMessageStatusChange,
    requestDeleteMessage,
    requestDeleteSkill,
    confirmDelete,
    cancelDelete,
  };
}
