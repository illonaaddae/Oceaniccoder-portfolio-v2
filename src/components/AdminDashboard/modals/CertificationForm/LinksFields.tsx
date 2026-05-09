import React from "react";
import type { CertificationFormState } from "./types";

interface LinksFieldsProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
}

export const LinksFields: React.FC<LinksFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Download Link</label>
      <input
        type="url"
        value={form.downloadLink}
        onChange={(e) => updateForm({ downloadLink: e.target.value })}
        className={inputClass}
        placeholder="https://..."
      />
    </div>
    <div>
      <label className={labelClass}>Verification Link</label>
      <input
        type="url"
        value={form.verifyLink}
        onChange={(e) => updateForm({ verifyLink: e.target.value })}
        className={inputClass}
        placeholder="https://..."
      />
    </div>
  </div>
);
