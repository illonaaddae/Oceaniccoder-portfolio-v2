import React from "react";
import { ImageUpload } from "../../ImageUpload";
import type { CertificationFormState } from "./types";

interface ImageFieldProps {
  form: CertificationFormState;
  updateForm: (updates: Partial<CertificationFormState>) => void;
  theme: "light" | "dark";
  labelClass: string;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  form,
  updateForm,
  theme,
  labelClass,
}) => (
  <div>
    <p className={labelClass}>Certificate File (Optional)</p>
    <p
      className={`text-xs mb-2 ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}
    >
      Upload an image or PDF of your certificate
    </p>
    <ImageUpload
      value={form.image}
      onChange={(url) => updateForm({ image: url })}
      label=""
      theme={theme}
      allowPdf={true}
      maxSizeMB={10}
    />
  </div>
);
