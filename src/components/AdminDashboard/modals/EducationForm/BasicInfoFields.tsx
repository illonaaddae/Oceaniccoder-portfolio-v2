import React from "react";
import type { EducationFormState, FormUpdater } from "./types";

interface BasicInfoFieldsProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  inputClass: string;
  labelClass: string;
}

export const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Institution */}
      <div>
        <label className={labelClass}>Institution *</label>
        <input
          type="text"
          required
          value={form.institution}
          onChange={(e) => updateForm({ institution: e.target.value })}
          className={inputClass}
          placeholder="University/School name"
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClass}>Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => updateForm({ location: e.target.value })}
          className={inputClass}
          placeholder="e.g., Accra, Ghana"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Degree */}
      <div>
        <label className={labelClass}>Degree *</label>
        <input
          type="text"
          required
          value={form.degree}
          onChange={(e) => updateForm({ degree: e.target.value })}
          className={inputClass}
          placeholder="e.g., Bachelor of Science"
        />
      </div>

      {/* Field of Study */}
      <div>
        <label className={labelClass}>Field of Study</label>
        <input
          type="text"
          value={form.field}
          onChange={(e) => updateForm({ field: e.target.value })}
          className={inputClass}
          placeholder="e.g., Computer Science"
        />
      </div>
    </div>
  </>
);
