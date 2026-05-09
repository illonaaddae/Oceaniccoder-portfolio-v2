import React from "react";
import type { DeleteConfirmState } from "./types";

interface DeleteConfirmModalProps {
  deleteConfirm: DeleteConfirmState;
  theme: "light" | "dark";
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deleteConfirm,
  theme,
  onConfirm,
  onCancel,
}) => {
  if (!deleteConfirm.show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        } rounded-xl p-6 max-w-md w-full shadow-2xl border ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h3
          className={`text-lg font-bold mb-3 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Confirm Delete
        </h3>
        <p
          className={`mb-6 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Are you sure you want to delete this {deleteConfirm.type}
          {deleteConfirm.name ? ` "${deleteConfirm.name}"` : ""}? This action
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === "dark"
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
