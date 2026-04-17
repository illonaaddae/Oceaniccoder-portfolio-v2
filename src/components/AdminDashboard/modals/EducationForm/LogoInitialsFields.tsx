import React from "react";
import type { EducationFormState, FormUpdater } from "./types";

interface LogoInitialsFieldsProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const LogoInitialsFields: React.FC<LogoInitialsFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
  theme,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    {/* University Logo URL */}
    <div>
      <label className={labelClass}>University Logo URL</label>
      <input
        type="url"
        value={form.universityLogo}
        onChange={(e) => updateForm({ universityLogo: e.target.value })}
        className={inputClass}
        placeholder="https://example.com/logo.png"
      />
      {form.universityLogo && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={form.universityLogo}
            alt="University logo preview"
            className="w-8 h-8 object-contain rounded"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            className={`text-xs ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Preview
          </span>
        </div>
      )}
    </div>

    {/* Initials (fallback when no logo) */}
    <div>
      <label className={labelClass}>Initials</label>
      <input
        type="text"
        maxLength={4}
        value={form.initials}
        onChange={(e) => updateForm({ initials: e.target.value.toUpperCase() })}
        className={inputClass}
        placeholder="e.g., UG"
      />
      <p
        className={`mt-1 text-xs ${
          theme === "dark" ? "text-slate-500" : "text-slate-400"
        }`}
      >
        Shown when no logo is available (max 4 characters)
      </p>
    </div>
  </div>
);
