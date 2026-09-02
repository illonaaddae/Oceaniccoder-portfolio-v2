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
    <label htmlFor="cert-credential" className={labelClass}>
      Credential ID
    </label>
    <input
      id="cert-credential"
      type="text"
      value={form.credential}
      onChange={(e) => updateForm({ credential: e.target.value })}
      className={`${inputClass} font-mono text-sm`}
      placeholder="e.g., 2234490f-2d2d-4fea-90a9-575e6990781f"
    />
  </div>
);
