import React from "react";
import { STATUS_OPTIONS } from "./constants";
import type { FormFieldProps } from "./types";

export const StatusFields: React.FC<FormFieldProps> = ({
  form,
  setForm,
  theme,
  inputClass,
  labelClass,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div>
      <label className={labelClass}>Status</label>
      <select
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
        className={inputClass}
        title="Select project status"
        aria-label="Select project status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    <div className="flex items-center pt-8">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          className="w-5 h-5 rounded border-2 text-oceanic-500 focus:ring-oceanic-500"
        />
        <span
          className={`font-medium ${
            theme === "dark" ? "text-slate-200" : "text-slate-700"
          }`}
        >
          Featured Project
        </span>
      </label>
    </div>
  </div>
);
