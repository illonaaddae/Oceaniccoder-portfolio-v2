import React from "react";
import { ImageUpload } from "../../ImageUpload";
import type { FormFieldProps } from "./types";

export const ImageYearFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  theme,
  inputClass,
  labelClass,
}) => (
  <>
    <div>
      <ImageUpload
        value={form.image}
        onChange={(url) => setForm({ ...form, image: url })}
        label="Project Image"
        theme={theme}
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>Year</label>
        <input
          type="text"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
          className={inputClass}
          placeholder="2024"
        />
      </div>
    </div>
  </>
);
