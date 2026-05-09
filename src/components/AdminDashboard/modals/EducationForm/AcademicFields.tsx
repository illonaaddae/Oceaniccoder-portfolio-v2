import React from "react";
import { classHonoursOptions } from "./constants";
import type { EducationFormState, FormUpdater } from "./types";

interface AcademicFieldsProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  inputClass: string;
  labelClass: string;
}

export const AcademicFields: React.FC<AcademicFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <>
    {/* GPA */}
    <div>
      <label className={labelClass}>GPA</label>
      <input
        type="text"
        value={form.gpa}
        onChange={(e) => updateForm({ gpa: e.target.value })}
        className={inputClass}
        placeholder="e.g., 3.8/4.0 or 3.8"
      />
    </div>

    {/* Class Honours */}
    <div>
      <label className={labelClass}>Class Honours</label>
      <select
        value={form.classHonours}
        onChange={(e) => updateForm({ classHonours: e.target.value })}
        className={inputClass}
        aria-label="Class Honours"
      >
        {classHonoursOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </>
);
