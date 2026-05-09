import React from "react";
import type { EducationFormState, FormUpdater } from "./types";

interface DescriptionFieldProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  inputClass: string;
  labelClass: string;
}

export const DescriptionField: React.FC<DescriptionFieldProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Description</label>
    <textarea
      rows={3}
      value={form.description}
      onChange={(e) => updateForm({ description: e.target.value })}
      className={inputClass}
      placeholder="Brief description of your studies, thesis, or academic focus..."
    />
  </div>
);
