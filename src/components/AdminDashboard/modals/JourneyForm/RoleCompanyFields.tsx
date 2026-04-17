import React from "react";
import type { JourneyFormState } from "./types";

interface RoleCompanyFieldsProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
}

export const RoleCompanyFields: React.FC<RoleCompanyFieldsProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Role/Title *</label>
      <input
        type="text"
        required
        value={form.role}
        onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
        className={inputClass}
        placeholder="e.g., Senior Developer"
      />
    </div>
    <div>
      <label className={labelClass}>Company *</label>
      <input
        type="text"
        required
        value={form.company}
        onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
        className={inputClass}
        placeholder="Company name"
      />
    </div>
  </div>
);
