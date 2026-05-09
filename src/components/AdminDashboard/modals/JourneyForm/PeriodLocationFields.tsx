import React from "react";
import type { JourneyFormState } from "./types";

interface PeriodLocationFieldsProps {
  form: JourneyFormState;
  setForm: React.Dispatch<React.SetStateAction<JourneyFormState>>;
  inputClass: string;
  labelClass: string;
}

export const PeriodLocationFields: React.FC<PeriodLocationFieldsProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Period *</label>
      <input
        type="text"
        required
        value={form.period}
        onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
        className={inputClass}
        placeholder="e.g., 2020 - Present"
      />
    </div>

    <div>
      <label className={labelClass}>Location</label>
      <input
        type="text"
        value={form.location}
        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        className={inputClass}
        placeholder="e.g., Accra, Ghana"
      />
    </div>
  </div>
);
