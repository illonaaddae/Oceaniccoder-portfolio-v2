import React from "react";
import { categories } from "./constants";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { SkillFormState } from "./types";

interface CategorySelectProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  form,
  setForm,
  labelClass,
  theme,
}) => (
  <div>
    <label className={labelClass}>Category *</label>
    <CustomSelect
      value={form.category}
      onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
      options={categories.map((cat) => ({ value: cat, label: cat }))}
      theme={theme}
      ariaLabel="Select skill category"
      placeholder="Select category"
    />
  </div>
);
