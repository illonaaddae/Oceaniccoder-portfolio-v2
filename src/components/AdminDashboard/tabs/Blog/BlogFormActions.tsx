import React from "react";
import { FaTimes, FaSave } from "react-icons/fa";

interface BlogFormActionsProps {
  theme: "light" | "dark";
  submitting: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

export const BlogFormActions: React.FC<BlogFormActionsProps> = ({
  theme,
  submitting,
  isEditing,
  onCancel,
}) => (
  <div
    className={`flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t ${
      theme === "dark" ? "border-white/10" : "border-blue-200/30"
    }`}
  >
    <button
      type="button"
      onClick={onCancel}
      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border ${
        theme === "dark"
          ? "bg-white/10 text-white hover:bg-white/20 border-white/20"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
      }`}
    >
      <FaTimes /> Cancel
    </button>
    <button
      type="submit"
      className={`w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-oceanic-500 to-emerald-500 text-white rounded-xl hover:from-oceanic-600 hover:to-emerald-600 transition-all font-medium shadow-lg shadow-oceanic-500/20 flex items-center justify-center gap-2 ${
        submitting ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={submitting}
    >
      {submitting ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Saving...
        </>
      ) : (
        <>
          <FaSave /> {isEditing ? "Update" : "Create"} Post
        </>
      )}
    </button>
  </div>
);
