import React from "react";
import type { JourneyFormState } from "./types";

interface DescriptionFieldProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
}

export const DescriptionField: React.FC<DescriptionFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Description</label>
    <textarea
      rows={3}
      value={form.description}
      onChange={(e) =>
        setForm((prev) => ({ ...prev, description: e.target.value }))
      }
      className={inputClass}
      placeholder="Brief description of your role and responsibilities..."
    />
  </div>
);
