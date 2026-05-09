import React from "react";
import type { TestimonialFormState } from "./types";

interface PersonInfoFieldsProps {
  form: TestimonialFormState;
  setForm: React.Dispatch<React.SetStateAction<TestimonialFormState>>;
  inputClass: string;
  labelClass: string;
}

export const PersonInfoFields: React.FC<PersonInfoFieldsProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className={inputClass}
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className={labelClass}>Role/Title *</label>
          <input
            type="text"
            required
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className={inputClass}
            placeholder="CEO, Senior Developer, etc."
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Company</label>
        <input
          type="text"
          value={form.company}
          onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
          className={inputClass}
          placeholder="Company Name (optional)"
        />
      </div>
    </>
  );
};
