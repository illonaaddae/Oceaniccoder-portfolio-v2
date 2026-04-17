import React from "react";
import { iconOptions } from "./constants";
import type { SkillFormState } from "./types";

interface IconSelectorProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
  theme,
}) => {
  const helperClass = `text-xs mt-1 ${
    theme === "dark" ? "text-slate-500" : "text-slate-500"
  }`;

  return (
    <div>
      <label className={labelClass}>Icon</label>
      <select
        value={iconOptions.some((opt) => opt.value === form.icon) ? form.icon : ""}
        onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
        className={inputClass}
        title="Select skill icon"
        aria-label="Select skill icon"
      >
        <option value="">Select Icon (Optional)</option>
        {iconOptions.map((opt) => (
          <option key={`${opt.value}-${opt.label}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <p className={helperClass}>Or enter a custom icon name below</p>

      <input
        type="text"
        value={form.icon}
        onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
        className={`${inputClass} mt-2`}
        placeholder="e.g., SiTypescript, SiNextdotjs, SiTailwindcss"
      />

      <p className={helperClass}>
        Use &quot;Fa&quot; prefix for Font Awesome or &quot;Si&quot; prefix for Simple Icons
      </p>
    </div>
  );
};
