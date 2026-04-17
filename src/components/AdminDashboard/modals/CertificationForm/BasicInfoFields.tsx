import React from "react";
import type { CertificationFormState } from "./types";

interface BasicInfoFieldsProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
}

export const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Certification Title *</label>
      <input
        type="text"
        required
        value={form.title}
        onChange={(e) => updateForm({ title: e.target.value })}
        className={inputClass}
        placeholder="e.g., AWS Solutions Architect"
      />
    </div>
    <div>
      <label className={labelClass}>Issuer *</label>
      <input
        type="text"
        required
        value={form.issuer}
        onChange={(e) => updateForm({ issuer: e.target.value })}
        className={inputClass}
        placeholder="e.g., Amazon Web Services"
      />
    </div>
  </div>
);
