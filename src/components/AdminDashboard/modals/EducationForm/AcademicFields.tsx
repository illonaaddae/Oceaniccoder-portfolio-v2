import React from "react";
import { classHonoursOptions } from "./constants";
import type { EducationFormState, FormUpdater } from "./types";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface AcademicFieldsProps {
  form: EducationFormState;
  updateForm: FormUpdater;
  inputClass: string;
  labelClass: string;
  theme: "light" | "dark";
}

export const AcademicFields: React.FC<AcademicFieldsProps> = ({
  form,
  updateForm,
  inputClass,
  labelClass,
  theme,
}) => (
  <>
    {/* GPA */}
    <div>
      <label className={labelClass}>GPA</label>
      <input
        type="text"
        value={form.gpa}
        onChange={(e) => updateForm({ gpa: e.target.value })}
        className={inputClass}
        placeholder="e.g., 3.8/4.0 or 3.8"
      />
    </div>

    {/* Class Honours */}
    <div>
      <label className={labelClass}>Class Honours</label>
      <CustomSelect
        value={form.classHonours}
        onChange={(value) => updateForm({ classHonours: value })}
        options={classHonoursOptions.filter((option) => option.value !== "")}
        theme={theme}
        placeholder="Select Honours (Optional)"
        ariaLabel="Class Honours"
        searchable
      />
    </div>
  </>
);
