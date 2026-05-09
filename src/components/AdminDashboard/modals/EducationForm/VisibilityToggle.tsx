import React from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import type { EducationFormState, FormUpdater } from "./types";

interface VisibilityToggleProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  theme: "light" | "dark";
  labelClass: string;
}

export const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  form,
  updateForm,
  theme,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Visibility</label>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => updateForm({ isVisible: true })}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
          form.isVisible
            ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white border-emerald-400 shadow-lg shadow-emerald-500/20"
            : theme === "dark"
              ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
              : "bg-white/50 border-blue-200/50 text-slate-600 hover:border-blue-300"
        }`}
      >
        <FaEye />
        Visible
      </button>
      <button
        type="button"
        onClick={() => updateForm({ isVisible: false })}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border ${
          !form.isVisible
            ? "bg-gradient-to-r from-slate-500 to-gray-500 text-white border-slate-400 shadow-lg shadow-slate-500/20"
            : theme === "dark"
              ? "bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600"
              : "bg-white/50 border-blue-200/50 text-slate-600 hover:border-blue-300"
        }`}
      >
        <FaEyeSlash />
        Hidden
      </button>
    </div>
    <p
      className={`mt-2 text-xs ${
        theme === "dark" ? "text-slate-500" : "text-slate-400"
      }`}
    >
      {form.isVisible
        ? "This education entry will be shown on your portfolio."
        : "This education entry will be hidden from your portfolio."}
    </p>
  </div>
);
