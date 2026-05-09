import React from "react";
import { categories } from "./constants";
import type { SkillFormState } from "./types";

interface CategorySelectProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Category *</label>
    <select
      required
      value={form.category}
      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
      className={inputClass}
      title="Select skill category"
      aria-label="Select skill category"
    >
      <option value="">Select Category</option>
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  </div>
);
