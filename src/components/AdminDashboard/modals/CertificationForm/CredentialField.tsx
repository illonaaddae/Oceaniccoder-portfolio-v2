import React from "react";
import type { CertificationFormState } from "./types";

interface CredentialFieldProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
}

export const CredentialField: React.FC<CredentialFieldProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <div>
    <label className={labelClass}>Credential ID</label>
    <input
      type="text"
      value={form.credential}
      onChange={(e) => updateForm({ credential: e.target.value })}
      className={inputClass}
      placeholder="e.g., ABC123XYZ"
    />
  </div>
);
