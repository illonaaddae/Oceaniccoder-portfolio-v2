import React from "react";
import type { FormFieldProps } from "./types";

export const LinksFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Live URL</label>
      <input
        type="url"
        value={form.liveUrl}
        onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
        className={inputClass}
        placeholder="https://myproject.com"
      />
    </div>
    <div>
      <label className={labelClass}>GitHub URL</label>
      <input
        type="url"
        value={form.githubUrl}
        onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
        className={inputClass}
        placeholder="https://github.com/..."
      />
    </div>
  </div>
);
