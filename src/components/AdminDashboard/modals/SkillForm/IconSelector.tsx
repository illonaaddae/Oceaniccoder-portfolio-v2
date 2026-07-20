import React from "react";
import {
  ICON_GROUPS,
  ICON_OPTIONS,
  getIconGroupsForCategory,
  predictNameFromIcon,
} from "@/utils/data/skillIconRegistry.jsx";
import type { SkillFormState } from "./types";

interface IconSelectorProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

interface IconGroup {
  group: string;
  options: { value: string; label: string }[];
}

export const IconSelector: React.FC<IconSelectorProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
  theme,
}) => {
  const helperClass = `text-xs mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`;

  // Narrow the icon list to the chosen category. If the current icon isn't in
  // that subset (e.g. editing a skill whose icon lives elsewhere), show all
  // groups so the existing selection stays visible.
  const scoped: IconGroup[] = getIconGroupsForCategory(form.category);
  const iconInScope = scoped.some((g) => g.options.some((o) => o.value === form.icon));
  const groups: IconGroup[] = !form.icon || iconInScope ? scoped : ICON_GROUPS;

  const handleSelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      icon: value,
      // Auto-suggest a name from the icon, but only while the name is still
      // empty — never overwrite something already typed.
      name: prev.name.trim() ? prev.name : predictNameFromIcon(value),
    }));
  };

  return (
    <div>
      <label className={labelClass}>Icon</label>
      <select
        value={ICON_OPTIONS.some((opt) => opt.value === form.icon) ? form.icon : ""}
        onChange={(e) => handleSelect(e.target.value)}
        className={inputClass}
        title="Select skill icon"
        aria-label="Select skill icon"
      >
        <option value="">
          {form.category ? `Select Icon (${form.category})` : "Select Icon (Optional)"}
        </option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((opt) => (
              <option key={`${g.group}-${opt.value}-${opt.label}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <p className={helperClass}>
        {form.category
          ? "Showing icons for the selected category. Or enter a custom icon name below."
          : "Pick a category above to narrow this list. Or enter a custom icon name below."}
      </p>

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
