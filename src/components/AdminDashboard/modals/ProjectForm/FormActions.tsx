import React from "react";
import { FaSave } from "react-icons/fa";

interface FormActionsProps {
  loading: boolean;
  isEditing: boolean;
  onClose: () => void;
  theme: "light" | "dark";
}

export const FormActions: React.FC<FormActionsProps> = ({
  loading,
  isEditing,
  onClose,
  theme,
}) => (
  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
    <button
      type="button"
      onClick={onClose}
      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        theme === "dark"
          ? "bg-white/10 text-white hover:bg-white/20"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        loading
          ? "opacity-50 cursor-not-allowed"
          : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white hover:from-oceanic-400 hover:to-oceanic-800"
      }`}
    >
      <FaSave />
      {loading ? "Saving..." : isEditing ? "Update" : "Create"}
    </button>
  </div>
);
