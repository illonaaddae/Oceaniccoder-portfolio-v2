import React from "react";
import { PLATFORMS } from "./constants";
import type { CertificationFormState } from "./types";

interface PlatformDateFieldsProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
}

export const PlatformDateFields: React.FC<PlatformDateFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Platform *</label>
      <select
        required
        value={form.platform}
        onChange={(e) => {
          const selected = PLATFORMS.find((p) => p.value === e.target.value);
          updateForm({
            platform: e.target.value,
            platformColor: selected?.color ?? "#3b82f6",
          });
        }}
        className={inputClass}
        title="Select certification platform"
        aria-label="Select certification platform"
      >
        <option value="">Select Platform</option>
        {PLATFORMS.map((platform) => (
          <option key={platform.value} value={platform.value}>
            {platform.value}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className={labelClass}>Date Obtained *</label>
      <input
        type="text"
        required
        value={form.date}
        onChange={(e) => updateForm({ date: e.target.value })}
        className={inputClass}
        placeholder="e.g., December 2024"
      />
    </div>
  </div>
);
