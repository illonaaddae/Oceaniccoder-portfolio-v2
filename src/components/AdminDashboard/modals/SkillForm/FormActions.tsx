import React from "react";
import { FaSave } from "react-icons/fa";

interface FormActionsProps {
  onClose: () => void;
  loading: boolean;
  isEditing: boolean;
  theme: "light" | "dark";
  disabled?: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onClose,
  loading,
  isEditing,
  theme,
  disabled = false,
}) => {
  const blocked = loading || disabled;
  return (
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
        disabled={blocked}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
          blocked
            ? "opacity-50 cursor-not-allowed bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white"
            : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white hover:from-oceanic-400 hover:to-oceanic-800"
        }`}
      >
        <FaSave />
        {loading ? "Saving..." : isEditing ? "Update" : "Create"}
      </button>
    </div>
  );
};
