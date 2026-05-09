import React from "react";
import { colorOptions } from "./constants";
import type { JourneyFormState } from "./types";

interface ColorThemeSelectProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const ColorThemeSelect: React.FC<ColorThemeSelectProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
  theme,
}) => (
  <div>
    <label className={labelClass}>Color Theme</label>
    <select
      value={form.color}
      onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
      className={inputClass}
      title="Select color theme"
      aria-label="Select color theme"
    >
      {colorOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="mt-2 flex items-center gap-2">
      <div className={`w-16 h-4 rounded bg-gradient-to-r ${form.color}`} />
      <span
        className={`text-xs ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}
      >
        Preview
      </span>
    </div>
  </div>
);
