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
        <select
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
          className={inputClass}
          aria-label="Project year"
        >
          <option value="">Select Year</option>
          {(() => {
            const current = new Date().getFullYear();
            const years: number[] = [];
            for (let y = current; y >= current - 20; y--) years.push(y);
            return years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ));
          })()}
        </select>
      </div>
    </div>
  </>
);
