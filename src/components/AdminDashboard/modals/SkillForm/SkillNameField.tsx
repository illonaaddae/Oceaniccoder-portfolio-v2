import React from "react";
import type { SkillFormState } from "./types";

interface SkillNameFieldProps {
  form: SkillFormState;
  setForm: React.Dispatch<React.SetStateAction<SkillFormState>>;
  inputClass: string;
  labelClass: string;
}

export const SkillNameField: React.FC<SkillNameFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Skill Name *</label>
    <input
      type="text"
      required
      value={form.name}
      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
      className={inputClass}
      placeholder="e.g., React, TypeScript, Python"
    />
  </div>
);
