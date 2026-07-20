import React from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ImageUpload } from "../../ImageUpload";
import type { FormFieldProps } from "./types";

export const ImageYearFields: React.FC<FormFieldProps> = ({ form, setForm, theme, labelClass }) => (
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
        <CustomSelect
          value={form.year}
          onChange={(value) => setForm({ ...form, year: value })}
          options={(() => {
            const current = new Date().getFullYear();
            const years: number[] = [];
            for (let y = current; y >= current - 20; y--) years.push(y);
            return years.map((y) => ({ value: String(y), label: String(y) }));
          })()}
          theme={theme}
          ariaLabel="Project year"
          placeholder="Select Year"
          searchable
        />
      </div>
    </div>
  </>
);
