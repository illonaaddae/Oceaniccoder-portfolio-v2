import React from "react";
import { FaSave } from "react-icons/fa";
import type { AboutForm } from "./useAboutForm";

interface SaveButtonProps {
  field: keyof AboutForm;
  label: string;
  saving: string | null;
  saved: string | null;
  onSave: (field: keyof AboutForm) => void;
  isReadOnly?: boolean;
  theme: "light" | "dark";
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  field,
  label,
  saving,
  saved,
  onSave,
  isReadOnly,
  theme,
}) => {
  if (isReadOnly) return null;
  return (
    <button
      type="button"
      onClick={() => onSave(field)}
      disabled={saving === field}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        saved === field
          ? "bg-green-500/20 text-green-400"
          : theme === "dark"
            ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {saving === field ? (
        <>
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Saving...
        </>
      ) : saved === field ? (
        <>✓ Saved</>
      ) : (
        <>
          <FaSave className="text-xs" />
          Save {label}
        </>
      )}
    </button>
  );
};

export default SaveButton;
