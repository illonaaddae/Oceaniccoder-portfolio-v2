import React from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CERTIFICATION_TYPES } from "./constants";
import type { CertificationFormState } from "./types";

interface CertificationTypeFieldProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

const CUSTOM_VALUE = "__custom__";

const OPTIONS = [
  ...CERTIFICATION_TYPES.map((t) => ({ value: t, label: t })),
  { value: CUSTOM_VALUE, label: "+ Custom / Other" },
];

export const CertificationTypeField: React.FC<CertificationTypeFieldProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
  theme,
}) => {
  const isCustom =
    form.certificationType === CUSTOM_VALUE ||
    (!!form.certificationType && !CERTIFICATION_TYPES.includes(form.certificationType));

  return (
    <div>
      <label className={labelClass}>Certification Type</label>
      <CustomSelect
        value={isCustom ? CUSTOM_VALUE : form.certificationType}
        onChange={(value) => updateForm({ certificationType: value })}
        options={OPTIONS}
        theme={theme}
        placeholder="Select type"
        ariaLabel="Certification type"
      />
      {isCustom && (
        <input
          type="text"
          value={form.certificationType === CUSTOM_VALUE ? "" : form.certificationType}
          onChange={(e) => updateForm({ certificationType: e.target.value || CUSTOM_VALUE })}
          className={`${inputClass} mt-3`}
          placeholder="e.g., Micro-credential"
          aria-label="Custom certification type"
        />
      )}
    </div>
  );
};
