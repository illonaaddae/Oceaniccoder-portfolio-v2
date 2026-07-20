import React, { useMemo } from "react";
import {
  ICON_GROUPS,
  ICON_OPTIONS,
  getIconGroupsForCategory,
  predictNameFromIcon,
  renderIconByComponent,
} from "@/utils/data/skillIconRegistry.jsx";
import { CustomSelect, type SelectGroup } from "@/components/ui/CustomSelect";
import type { SkillFormState } from "./types";

interface IconSelectorProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

interface RegistryGroup {
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
  const scoped: RegistryGroup[] = getIconGroupsForCategory(form.category);
  const iconInScope = scoped.some((g) => g.options.some((o) => o.value === form.icon));
  const source: RegistryGroup[] = !form.icon || iconInScope ? scoped : ICON_GROUPS;

  // Attach a rendered icon preview to each option for the dropdown.
  const selectGroups: SelectGroup[] = useMemo(
    () =>
      source.map((g) => ({
        group: g.group,
        options: g.options.map((o) => ({
          value: o.value,
          label: o.label,
          icon: renderIconByComponent(o.value, "text-base"),
        })),
      })),
    [source],
  );

  const handleSelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      icon: value,
      // Auto-suggest a name from the icon, but only while the name is still
      // empty — never overwrite something already typed.
      name: prev.name.trim() ? prev.name : predictNameFromIcon(value),
    }));
  };

  const knownIcon = ICON_OPTIONS.some((o) => o.value === form.icon);

  return (
    <div>
      <label className={labelClass}>Icon</label>
      <CustomSelect
        value={knownIcon ? form.icon : ""}
        onChange={handleSelect}
        groups={selectGroups}
        theme={theme}
        searchable
        ariaLabel="Select skill icon"
        placeholder={form.category ? `Select icon (${form.category})` : "Select an icon (optional)"}
      />

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
